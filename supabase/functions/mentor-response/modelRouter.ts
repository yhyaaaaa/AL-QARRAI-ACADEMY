import type { MentorId, TaskType } from "./schemas.ts";
import { TASK_TYPES } from "./schemas.ts";
import type { ChatProvider } from "./providers/openaiCompatible.ts";

export interface ModelConfig {
  /** lightweight classification */
  fast: string;
  /** primary draft: maths & sciences */
  draft: string;
  /** validator for every student-facing answer */
  validator: string;
  /** language & writing specialist */
  writing: string;
  /** programming specialist */
  coder: string;
  /** document / image text extraction */
  ocr: string;
}

/** Routing table: task type → model role. Edit here to change routing policy. */
export const ROUTING_TABLE: Record<TaskType, keyof ModelConfig> = {
  math: "draft",
  science: "draft",
  general: "draft",
  language: "writing",
  writing: "writing",
  code: "coder",
};

export function routeDraftModel(task: TaskType, models: ModelConfig): string {
  return models[ROUTING_TABLE[task]];
}

export const MENTOR_DEFAULT_TASK: Record<MentorId, TaskType> = {
  ba9lewa: "math",
  ibnbatbuta: "science",
  falfoul: "language",
};

/** Which labels the classifier may choose for each mentor (guards against misrouting). */
const ALLOWED_TASKS: Record<MentorId, TaskType[]> = {
  ba9lewa: ["math", "code", "general"],
  ibnbatbuta: ["science", "math", "code", "general"],
  falfoul: ["language", "writing", "general"],
};

const CODE_RE =
  /```|\b(python|javascript|typescript|java|c\+\+|function|algorithm|code|programm\w*|script|compile)\b/i;
const WRITING_RE =
  /\b(essay|compose|composition|paragraph|letter|r[ée]dige\w*|r[ée]daction|dissertation)\b|write (?:me )?(?:a|an)\b|إنشاء|اكتب|مقال/i;

/** Deterministic, zero-cost classification used as default and as fallback. */
export function heuristicClassify(text: string, mentorId: MentorId): TaskType {
  if (mentorId !== "falfoul" && CODE_RE.test(text)) return "code";
  if (mentorId === "falfoul" && WRITING_RE.test(text)) return "writing";
  return MENTOR_DEFAULT_TASK[mentorId];
}

/**
 * Optional lightweight model classification (MODEL_FAST). Constrained to the mentor's
 * allowed task set so a misclassification cannot route e.g. maths to the writing model.
 */
export async function classifyTask(
  provider: ChatProvider,
  model: string,
  text: string,
  mentorId: MentorId,
): Promise<{ task: TaskType; by: "model" | "heuristic" }> {
  const fallback = heuristicClassify(text, mentorId);
  try {
    const raw = await provider.complete({
      model,
      temperature: 0,
      maxTokens: 5,
      timeoutMs: 8000,
      messages: [
        {
          role: "system",
          content:
            "Classify the student's request into exactly one label: math, science, language, writing, code, general. Reply with the label only.",
        },
        { role: "user", content: text.slice(0, 1500) },
      ],
    });
    const label = raw.toLowerCase().match(/[a-z]+/)?.[0] as TaskType | undefined;
    if (!label || !TASK_TYPES.includes(label) || !ALLOWED_TASKS[mentorId].includes(label)) {
      return { task: fallback, by: "heuristic" };
    }
    return { task: label === "general" ? MENTOR_DEFAULT_TASK[mentorId] : label, by: "model" };
  } catch {
    return { task: fallback, by: "heuristic" };
  }
}
