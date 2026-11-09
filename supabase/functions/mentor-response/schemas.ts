/**
 * Shared request/response contract for the `mentor-response` function.
 * Imported by the Edge Function, the local dev proxy AND the frontend (type-only),
 * so the three can never drift apart.
 */
import { z } from "zod";

export const MENTOR_IDS = ["ba9lewa", "ibnbatbuta", "falfoul"] as const;
export const MentorIdSchema = z.enum(MENTOR_IDS);
export type MentorId = z.infer<typeof MentorIdSchema>;

export const LanguageSchema = z.enum(["auto", "en", "fr", "ar", "tn"]);
export type Language = z.infer<typeof LanguageSchema>;

export const ChatTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(8000),
});
export type ChatTurn = z.infer<typeof ChatTurnSchema>;

export const MaterialSchema = z.object({
  name: z.string().max(200),
  text: z.string().max(20000),
});
export type Material = z.infer<typeof MaterialSchema>;

export const TutorRequestSchema = z.object({
  action: z.literal("tutor"),
  mentorId: MentorIdSchema,
  intent: z.enum(["chat", "exercise"]).default("chat"),
  mode: z.enum(["explain", "askwhy"]).default("explain"),
  language: LanguageSchema.default("auto"),
  messages: z.array(ChatTurnSchema).min(1).max(40),
  material: MaterialSchema.optional(),
});
export type TutorRequest = z.infer<typeof TutorRequestSchema>;
export type TutorRequestInput = z.input<typeof TutorRequestSchema>;

export const ExerciseSchema = z.object({
  question: z.string().min(5),
  hints: z.array(z.string()).max(4).default([]),
  answer: z.coerce.string().min(1),
  answerType: z.enum(["numeric", "text"]).default("text"),
  explanation: z.string().min(1),
});
export type Exercise = z.infer<typeof ExerciseSchema>;

export const ValidationSchema = z.object({
  decision: z.enum(["accept", "reject"]),
  issues: z.array(z.string()).default([]),
  confidence: z.coerce.number().min(0).max(1),
});
export type Validation = z.infer<typeof ValidationSchema>;

export const TASK_TYPES = ["math", "science", "language", "writing", "code", "general"] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export interface ValidationReport extends Validation {
  /** Issues found by deterministic (non-LLM) checks, e.g. arithmetic verification. */
  deterministicIssues: string[];
  /** How many arithmetic statements were verified deterministically. */
  arithmeticChecked: number;
  validatorModel: string;
  /** true when the validator's output could not be parsed (treated as reject: fail closed). */
  validatorParseFailed: boolean;
}

export interface TutorResponse {
  content: string;
  /** validated = passed validation; fallback = no reliable answer could be produced */
  status: "validated" | "fallback";
  exercise?: Exercise;
  meta: {
    mentorId: MentorId;
    task: TaskType;
    classifiedBy: "model" | "heuristic";
    draftModel: string;
    attempts: number;
    validation: ValidationReport[];
    latencyMs: number;
    /** suggested next questions, extracted from the validated reply */
    followUps?: string[];
  };
}
