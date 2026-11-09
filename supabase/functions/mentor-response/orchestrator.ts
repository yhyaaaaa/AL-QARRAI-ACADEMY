/**
 * Shared tutoring engine. One pipeline, three mentors.
 *
 *   request → mentor lookup → task classification → model routing
 *           → draft → validation → (revision → validation) → delivery | safe fallback
 *
 * No unvalidated draft is ever returned to the student.
 */
import {
  ExerciseSchema,
  type Exercise,
  type TutorRequest,
  type TutorResponse,
  type ValidationReport,
} from "./schemas.ts";
import type { ChatProvider, ProviderMessage } from "./providers/openaiCompatible.ts";
import {
  classifyTask,
  heuristicClassify,
  routeDraftModel,
  type ModelConfig,
} from "./modelRouter.ts";
import { buildSystemPrompt, getMentorPrompt, type AgeBand, type LearnerProfile } from "./prompts/index.ts";
import { extractJsonObject, validateDraft } from "./validator.ts";

export const MAX_HISTORY_TURNS = 12;

export interface PipelineDeps {
  provider: ChatProvider;
  models: ModelConfig;
  enableClassifier: boolean;
  ageBand?: AgeBand;
  learner?: LearnerProfile;
  /** random per-request token used to delimit untrusted material */
  boundary?: string;
  now?: () => number;
}

export function detectLanguage(text: string): "en" | "fr" | "ar" {
  if (/[؀-ۿ]/.test(text)) return "ar";
  if (
    /[àâçéèêëîïôûùüÿœ]/i.test(text) ||
    /\b(le|la|les|une|est|pourquoi|comment|je|tu|bonjour|merci)\b/i.test(text)
  ) {
    return "fr";
  }
  return "en";
}

interface Draft {
  content: string;
  exercise?: Exercise;
  /** Text the validator and arithmetic checker inspect. */
  reviewText: string;
  /** Structural problem detected before validation (e.g. malformed exercise JSON). */
  structuralIssue?: string;
}

/** Splits the "FOLLOW-UPS:" block from a reply into structured suggestions. */
export function splitFollowUps(text: string): { content: string; followUps: string[] } {
  const m = /\n\s*(?:#+\s*)?\**\s*follow[- ]?ups?\s*:?\s*\**\s*\n([\s\S]*)$/i.exec(text);
  if (!m) return { content: text.trim(), followUps: [] };
  const followUps = m[1]
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter((l) => l.length > 3 && l.length <= 200)
    .slice(0, 3);
  return { content: text.slice(0, m.index).trim(), followUps };
}

/** Removes revision meta-commentary small models prepend ("Here is the revised response:", "---"). */
export function stripMetaPreamble(text: string): string {
  const lines = text.split("\n");
  let i = 0;
  const META =
    /\b(revised|corrected|updated|improved) (response|answer|version)\b|\b(reviewer|the issues? (raised|identified))\b|^(certainly|sure|of course)[!,.]?\s.*\b(correct|revis|fix)/i;
  while (
    i < Math.min(lines.length, 4) &&
    (META.test(lines[i]) || /^\s*(-{3,}|\*{3,})?\s*$/.test(lines[i]))
  )
    i++;
  const rest = lines.slice(i).join("\n").trim();
  return rest.length > 0 ? rest : text.trim();
}

function interpretDraft(raw: string, intent: TutorRequest["intent"]): Draft {
  if (intent !== "exercise") {
    const content = stripMetaPreamble(raw);
    return { content, reviewText: content };
  }
  const parsed = ExerciseSchema.safeParse(extractJsonObject(raw));
  if (!parsed.success) {
    return {
      content: raw,
      reviewText: raw,
      structuralIssue:
        "The exercise was not a valid JSON object with question, hints, answer, answerType and explanation.",
    };
  }
  const ex = parsed.data;
  return {
    content: `**Exercise:** ${ex.question}`,
    exercise: ex,
    reviewText: `QUESTION: ${ex.question}\nHINTS: ${ex.hints.join(" | ")}\nEXPECTED ANSWER: ${ex.answer}\nEXPLANATION: ${ex.explanation}`,
  };
}

export async function runTutorPipeline(
  req: TutorRequest,
  deps: PipelineDeps,
): Promise<TutorResponse> {
  const now = deps.now ?? Date.now;
  const started = now();
  const mentor = getMentorPrompt(req.mentorId);
  const history = req.messages.slice(-MAX_HISTORY_TURNS);
  const lastUser = [...history].reverse().find((m) => m.role === "user")?.content ?? "";
  const studentRequest =
    req.intent === "exercise"
      ? `Create a practice exercise. Recent conversation: ${lastUser || "(none)"}`
      : lastUser;

  // 1. classification + routing
  const { task, by } = deps.enableClassifier
    ? await classifyTask(deps.provider, deps.models.fast, lastUser || mentor.domain, req.mentorId)
    : { task: heuristicClassify(lastUser, req.mentorId), by: "heuristic" as const };
  const draftModel = routeDraftModel(task, deps.models);

  // 2. persona injected independently of the routed model
  const system = buildSystemPrompt(mentor, {
    language: req.language,
    intent: req.intent,
    mode: req.mode,
    material: req.material,
    ageBand: deps.ageBand,
    learner: deps.learner,
    boundary: deps.boundary,
  });
  const baseMessages: ProviderMessage[] = [{ role: "system", content: system }, ...history];
  if (req.intent === "exercise") {
    baseMessages.push({
      role: "user",
      content: "Please give me a practice exercise now (JSON only).",
    });
  }

  const validations: ValidationReport[] = [];
  let messages = baseMessages;
  const MAX_ATTEMPTS = 2; // draft + one correction

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const raw = await deps.provider.complete({
      model: draftModel,
      messages,
      temperature: attempt === 1 ? 0.4 : 0.2,
      maxTokens: 900,
    });
    const draft = interpretDraft(raw, req.intent);

    let report: ValidationReport;
    if (draft.structuralIssue) {
      report = {
        decision: "reject",
        issues: [draft.structuralIssue],
        confidence: 0,
        deterministicIssues: [draft.structuralIssue],
        arithmeticChecked: 0,
        validatorModel: "schema",
        validatorParseFailed: false,
      };
    } else {
      report = await validateDraft(deps.provider, deps.models.validator, {
        mentor,
        studentRequest,
        draft: draft.reviewText,
        materialExcerpt: req.material?.text,
      });
    }
    validations.push(report);

    if (report.decision === "accept") {
      const split = req.intent === "chat" ? splitFollowUps(draft.content) : { content: draft.content, followUps: [] };
      return {
        content: split.content,
        status: "validated",
        exercise: draft.exercise,
        meta: {
          mentorId: req.mentorId,
          task,
          classifiedBy: by,
          draftModel,
          attempts: attempt,
          validation: validations,
          latencyMs: now() - started,
          followUps: split.followUps,
        },
      };
    }

    // 3. ask the draft model for a corrected version, guided by the reviewer's issues
    messages = [
      ...baseMessages,
      { role: "assistant", content: raw },
      {
        role: "user",
        content: [
          "A reviewer found problems with your previous answer:",
          ...report.issues.map((i) => `- ${i}`),
          req.intent === "exercise"
            ? "Produce a corrected exercise as ONLY the JSON object described earlier."
            : "Rewrite your answer to the student's last message, fixing every issue. Output ONLY the answer the student will read, in your mentor voice. Never mention a reviewer, a correction, a revision or a previous answer.",
        ].join("\n"),
      },
    ];
  }

  // 4. still rejected → safe clarification, never the unvalidated draft
  const chosen = req.language === "auto" ? detectLanguage(lastUser) : req.language;
  const lang = chosen === "tn" ? "ar" : chosen;
  return {
    content: mentor.fallbackMessage[lang],
    status: "fallback",
    meta: {
      mentorId: req.mentorId,
      task,
      classifiedBy: by,
      draftModel,
      attempts: MAX_ATTEMPTS,
      validation: validations,
      latencyMs: now() - started,
    },
  };
}
