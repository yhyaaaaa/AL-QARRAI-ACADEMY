import type { MentorId } from "../../supabase/functions/mentor-response/schemas.ts";

export type ActivityKind = "quiz" | "summary" | "mindmap" | "flashcards" | "keyterms" | "teachback" | "game" | "diagnostic";

/** Student-visible content (answers are never included — see learning_items.solution). */
export interface QuizContent {
  questions: (
    | { type: "mc"; prompt: string; options: string[]; hint?: string }
    | { type: "tf"; prompt: string; hint?: string }
    | { type: "short"; prompt: string; hint?: string }
  )[];
}
export interface SummaryContent {
  title: string;
  overview: string;
  mainIdeas: string[];
  concepts: { name: string; explanation: string }[];
  definitions: { term: string; definition: string }[];
  takeaways: string[];
}
export interface MindMapContent {
  center: string;
  branches: { label: string; summary?: string; children: { label: string; detail?: string }[] }[];
  links: { from: string; to: string; label?: string }[];
}
export interface FlashcardsContent {
  cards: { front: string; back: string; hint?: string }[];
}
export interface KeyTermsContent {
  terms: { term: string; definition: string; example: string; related: string[]; pronunciation?: string }[];
}
export interface TeachBackContent {
  introduction: string;
  prompt: string;
}
export type GameChallenge =
  | { type: "match"; instructions: string; left: string[]; right: string[] }
  | { type: "sequence"; instructions: string; steps: string[] }
  | { type: "choice"; prompt: string; options: string[]; hint?: string };
export interface GameContent {
  title: string;
  story?: string;
  challenges: GameChallenge[];
}

export interface ContentByKind {
  quiz: QuizContent;
  diagnostic: QuizContent;
  summary: SummaryContent;
  mindmap: MindMapContent;
  flashcards: FlashcardsContent;
  keyterms: KeyTermsContent;
  teachback: TeachBackContent;
  game: GameContent;
}

export interface LearningItem<K extends ActivityKind = ActivityKind> {
  id: string;
  mentor_id: MentorId;
  subject_id: string | null;
  kind: K;
  topic: string;
  language: string;
  options: { difficulty?: "easy" | "medium" | "hard"; length?: "short" | "standard" | "detailed"; count?: number; level?: number };
  content: ContentByKind[K];
  meta: { model?: string; attempts?: number; latencyMs?: number; validation?: { decision: string; validatorModel?: string; arithmeticChecked?: number }[] };
  created_at: string;
}

export interface CheckResult {
  correct: boolean | null;
  explanation: string | null;
  correctAnswer: unknown;
  points: number;
  triesLeft: number;
  alreadyDone?: boolean;
  message?: string;
}

export interface TeachBackEvaluation {
  understanding: 0 | 1 | 2 | 3;
  correctIdeas: string[];
  missingIdeas: string[];
  misconceptions: string[];
  feedback: string;
  nextStep: string;
}

export interface AttemptRow {
  id: string;
  item_id: string;
  part: number;
  answer: unknown;
  is_correct: boolean | null;
  score: number | null;
  points: number;
  feedback: Partial<TeachBackEvaluation>;
  created_at: string;
}

export interface LearningStats {
  items_by_kind: Partial<Record<ActivityKind, number>>;
  items_by_mentor: Partial<Record<MentorId, number>>;
  points: number;
  game_points_by_mentor: Partial<Record<MentorId, number>>;
  game_levels_by_mentor: Partial<Record<MentorId, number>>;
  quizzes: { id: string; mentor_id: MentorId; topic: string; total: number; answered: number; correct: number; created_at: string }[];
  teachback: { mentor_id: MentorId; topic: string; score: number; created_at: string }[];
  strengths: { mentor_id: MentorId; topic: string; accuracy: number }[];
  needs_practice: { mentor_id: MentorId; topic: string; accuracy: number }[];
  flashcards: { known: number; practice: number };
  active_days: number;
  topics: { mentor_id: MentorId; topic: string; last: string }[];
}
