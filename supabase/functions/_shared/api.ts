/**
 * Public API contract of the Edge Functions. The frontend imports these types,
 * so client and server cannot drift apart.
 */
import { z } from "zod";
import {
  LanguageSchema,
  MentorIdSchema,
  type MentorId,
  type TutorResponse,
} from "../mentor-response/schemas.ts";

export const MAX_STUDENT_MESSAGE = 4000;
export const MAX_ANSWER = 500;

export const ChatRequestSchema = z.object({
  action: z.literal("chat"),
  mentorId: MentorIdSchema,
  sessionId: z.string().uuid().optional(),
  content: z.string().trim().min(1).max(MAX_STUDENT_MESSAGE),
  intent: z.enum(["chat", "exercise"]).default("chat"),
  mode: z.enum(["explain", "askwhy"]).default("explain"),
  language: LanguageSchema.default("auto"),
  documentId: z.string().uuid().optional(),
});
export type ChatRequest = z.input<typeof ChatRequestSchema>;

export const GradeRequestSchema = z.object({
  action: z.literal("grade"),
  exerciseId: z.string().uuid(),
  answer: z.string().trim().min(1).max(MAX_ANSWER),
});
export type GradeRequest = z.input<typeof GradeRequestSchema>;

export const MentorFunctionSchema = z.discriminatedUnion("action", [
  ChatRequestSchema,
  GradeRequestSchema,
]);

export const ProcessDocumentSchema = z.object({
  storagePath: z.string().min(3).max(400),
  fileName: z.string().trim().min(1).max(200),
});
export type ProcessDocumentRequest = z.input<typeof ProcessDocumentSchema>;

export const AccountRequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("export") }),
  z.object({ action: z.literal("invite_guardians") }),
  z.object({ action: z.literal("delete"), confirm: z.literal("DELETE MY ACCOUNT") }),
]);
export type AccountRequest = z.input<typeof AccountRequestSchema>;

// ── response shapes (mirror DB rows, snake_case) ────────────────────────────
export interface SessionRow {
  id: string;
  user_id: string;
  mentor_id: MentorId;
  subject_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

export type MessageStatus = "validated" | "fallback" | "safety";

export interface MessageMeta {
  ai?: TutorResponse["meta"];
  redactedKinds?: string[];
  safety?: string[];
  documentName?: string;
}

export interface MessageRow {
  id: string;
  session_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  status: MessageStatus | null;
  intent: "chat" | "exercise";
  document_id: string | null;
  redacted: boolean;
  flags: string[];
  meta: MessageMeta;
  created_at: string;
}

/** Row of the my_exercises view: answer/explanation are null until the exercise is completed. */
export interface ExerciseView {
  id: string;
  session_id: string | null;
  message_id: string | null;
  mentor_id: MentorId;
  subject_id: string | null;
  question: string;
  hints: string[];
  answer_type: "numeric" | "text";
  status: "assigned" | "completed";
  attempts: number;
  student_answer: string | null;
  is_correct: boolean | null;
  feedback: string | null;
  graded_by: "deterministic" | "model" | null;
  answer: string | null;
  explanation: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface DocumentRow {
  id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  status: "processing" | "ready" | "failed";
  extraction_method: "text" | "pdf" | "ocr" | null;
  char_count: number | null;
  flags: string[];
  error: string | null;
  created_at: string;
}

export interface ChatResponse {
  session: SessionRow;
  messages: MessageRow[];
  exercise?: ExerciseView;
}

export interface GradeResponse {
  exercise: ExerciseView;
  correct: boolean | null;
  feedback: string;
}

export interface ApiErrorBody {
  error: { code: string; message: string; retryAfterSeconds?: number };
}
