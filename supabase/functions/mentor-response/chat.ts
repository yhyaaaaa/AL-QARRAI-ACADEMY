/**
 * action "chat": one tutoring turn, end to end on the server.
 *
 *  auth → screening (PII redaction, wellbeing, prompt injection) → quota gate
 *  → history from the DB → shared tutoring pipeline (route, draft, validate, correct)
 *  → persist user + assistant message (+ exercise) → respond.
 *
 * Nothing is persisted if the AI provider fails, so a retry never duplicates history.
 */
import type { RequestContext } from "../_shared/context.ts";
import { openAiSession } from "../_shared/context.ts";
import { HttpError, randomToken } from "../_shared/http.ts";
import {
  detectInjection,
  detectWellbeingConcern,
  INJECTION_REPLY,
  redactPersonalData,
  WELLBEING_REPLY,
} from "../_shared/safety.ts";
import {
  ChatRequestSchema,
  type ChatResponse,
  type ExerciseView,
  type MessageMeta,
  type MessageRow,
  type SessionRow,
} from "../_shared/api.ts";
import { detectLanguage, runTutorPipeline } from "./orchestrator.ts";
import { TutorRequestSchema, type TutorResponse } from "./schemas.ts";
import { getMentorPrompt } from "./prompts/index.ts";
import { ProviderError } from "./providers/openaiCompatible.ts";

const HISTORY_LIMIT = 12;

export async function handleChat(ctx: RequestContext, raw: unknown): Promise<ChatResponse> {
  const parsed = ChatRequestSchema.safeParse(raw);
  if (!parsed.success)
    throw new HttpError(400, "BAD_REQUEST", "Your message could not be sent (invalid request).");
  const req = parsed.data;
  const { db, student } = ctx;
  const mentor = getMentorPrompt(req.mentorId);
  const language = req.language === "auto" ? student.preferredLanguage : req.language;
  const chosenLang = language === "auto" ? detectLanguage(req.content) : language;
  const replyLang = chosenLang === "tn" ? "ar" : chosenLang;

  // ── 1. existing session must belong to the student and to this mentor ──
  let session: SessionRow | null = null;
  if (req.sessionId) {
    const { data } = await db
      .from("sessions")
      .select("*")
      .eq("id", req.sessionId)
      .eq("user_id", student.id)
      .maybeSingle();
    if (!data) throw new HttpError(404, "NOT_FOUND", "This learning session no longer exists.");
    if (data.mentor_id !== req.mentorId)
      throw new HttpError(400, "BAD_REQUEST", "This session belongs to another mentor.");
    session = data as SessionRow;
  }

  // ── 2. deterministic screening before anything reaches a model ──
  const redaction = redactPersonalData(req.content);
  const wellbeing = detectWellbeingConcern(req.content);
  const injection = detectInjection(req.content);

  const ensureSession = async (): Promise<SessionRow> => {
    if (session) return session;
    const title =
      req.intent === "exercise"
        ? `Practice with ${mentor.name.split(" ")[0]}`
        : redaction.text.replace(/\s+/g, " ").slice(0, 60);
    const { data, error } = await db
      .from("sessions")
      .insert({ user_id: student.id, mentor_id: req.mentorId, title: title || "New session" })
      .select("*")
      .single();
    if (error || !data) throw new HttpError(500, "INTERNAL", "Could not start a learning session.");
    session = data as SessionRow;
    return session;
  };

  const persist = async (
    assistant: { content: string; status: "validated" | "fallback" | "safety"; meta: MessageMeta },
    flags: string[],
    documentId: string | null,
    documentName?: string,
  ) => {
    const s = await ensureSession();
    const { data: userMsg, error: e1 } = await db
      .from("messages")
      .insert({
        session_id: s.id,
        user_id: student.id,
        role: "user",
        content: redaction.text,
        intent: req.intent,
        document_id: documentId,
        redacted: redaction.redacted,
        flags,
        meta: { redactedKinds: redaction.kinds, documentName } satisfies MessageMeta,
      })
      .select("*")
      .single();
    if (e1 || !userMsg) throw new HttpError(500, "INTERNAL", "Could not save your message.");
    const { data: botMsg, error: e2 } = await db
      .from("messages")
      .insert({
        session_id: s.id,
        user_id: student.id,
        role: "assistant",
        content: assistant.content,
        status: assistant.status,
        intent: req.intent,
        meta: assistant.meta,
      })
      .select("*")
      .single();
    if (e2 || !botMsg) throw new HttpError(500, "INTERNAL", "Could not save the mentor's reply.");
    return { session: s, messages: [userMsg as MessageRow, botMsg as MessageRow] };
  };

  if (wellbeing.length > 0) {
    // category only — never the child's words — goes to the security log
    await ctx.logEvent("wellbeing_concern", "critical", {
      categories: wellbeing,
      mentor: req.mentorId,
    });
    return persist(
      { content: WELLBEING_REPLY[replyLang], status: "safety", meta: { safety: wellbeing } },
      wellbeing,
      null,
    );
  }
  if (injection.length > 0) {
    await ctx.logEvent("prompt_injection", "warning", { patterns: injection, source: "message" });
    return persist(
      { content: INJECTION_REPLY[replyLang], status: "safety", meta: { safety: injection } },
      injection,
      null,
    );
  }

  // ── 3. optional learning material (must be the student's own, processed document) ──
  let material: { name: string; text: string } | undefined;
  let documentId: string | null = null;
  if (req.documentId) {
    const { data: doc } = await db
      .from("documents")
      .select("id, file_name, status, extracted_text")
      .eq("id", req.documentId)
      .eq("user_id", student.id)
      .maybeSingle();
    if (!doc) throw new HttpError(404, "NOT_FOUND", "That document was not found.");
    if (doc.status !== "ready" || !doc.extracted_text) {
      throw new HttpError(400, "BAD_REQUEST", "That document has no readable text yet.");
    }
    material = { name: doc.file_name, text: doc.extracted_text };
    documentId = doc.id;
  }

  // ── 4. quota / rate limit / kill switch, then the tutoring pipeline ──
  const ai = await openAiSession(ctx, req.intent === "exercise" ? "exercise" : "chat");
  let history: { role: "user" | "assistant"; content: string }[] = [];
  if (session) {
    const { data } = await db
      .from("messages")
      .select("role, content")
      .eq("session_id", session.id)
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT);
    history = ((data ?? []) as { role: "user" | "assistant"; content: string }[]).reverse();
  }

  let result: TutorResponse;
  try {
    result = await runTutorPipeline(
      TutorRequestSchema.parse({
        action: "tutor",
        mentorId: req.mentorId,
        intent: req.intent,
        mode: req.mode,
        language,
        messages: [...history, { role: "user", content: redaction.text }].map((m) => ({
          role: m.role,
          content: m.content.slice(0, 8000),
        })),
        material,
      }),
      {
        provider: ai.provider,
        models: ctx.ai.models,
        enableClassifier: ctx.ai.enableClassifier,
        ageBand: student.ageBand,
        learner: student.learner,
        boundary: randomToken(),
      },
    );
  } catch (e) {
    await ai.finish();
    if (e instanceof ProviderError) {
      console.error(JSON.stringify({ event: "provider_error", model: e.model, status: e.status }));
      throw new HttpError(
        502,
        "PROVIDER_ERROR",
        `The AI service did not answer (${e.model ?? "model"}${e.status ? `, HTTP ${e.status}` : ""}). Your message was not saved; please try again in a moment.`,
      );
    }
    throw e;
  }
  await ai.finish();

  // ── 5. persist the validated turn (and the exercise, answer kept server-side) ──
  const out = await persist(
    { content: result.content, status: result.status, meta: { ai: result.meta } },
    [],
    documentId,
    material?.name,
  );

  let exercise: ExerciseView | undefined;
  if (result.exercise) {
    const ex = result.exercise;
    const { data, error } = await db
      .from("exercises")
      .insert({
        user_id: student.id,
        session_id: out.session.id,
        message_id: out.messages[1].id,
        mentor_id: req.mentorId,
        question: ex.question,
        hints: ex.hints,
        answer: ex.answer,
        answer_type: ex.answerType,
        explanation: ex.explanation,
      })
      .select(
        "id, session_id, message_id, mentor_id, subject_id, question, hints, answer_type, status, attempts, student_answer, is_correct, feedback, graded_by, created_at, completed_at",
      )
      .single();
    if (error || !data) throw new HttpError(500, "INTERNAL", "Could not save the exercise.");
    exercise = {
      ...(data as Omit<ExerciseView, "answer" | "explanation">),
      answer: null,
      explanation: null,
    };
  }

  console.info(
    JSON.stringify({
      event: "mentor_response",
      mentor: req.mentorId,
      task: result.meta.task,
      model: result.meta.draftModel,
      status: result.status,
      attempts: result.meta.attempts,
      latencyMs: result.meta.latencyMs,
      tokens: ai.usage.reduce((a, u) => a + u.promptTokens + u.completionTokens, 0),
    }),
  );
  return { ...out, exercise };
}
