import type { SessionRow } from "../../supabase/functions/_shared/api.ts";
import type { MentorId } from "../../supabase/functions/mentor-response/schemas.ts";

export type {
  ChatRequest,
  ChatResponse,
  DocumentRow,
  ExerciseView,
  GradeResponse,
  MessageMeta,
  MessageRow,
  MessageStatus,
  SessionRow,
} from "../../supabase/functions/_shared/api.ts";
export type { Language, MentorId } from "../../supabase/functions/mentor-response/schemas.ts";

export type AgeBand = "under_13" | "13_15" | "16_17" | "18_plus";

export type AccountType = "student" | "parent";

export interface Profile {
  id: string;
  account_type: AccountType;
  display_name: string;
  /** null for parent accounts */
  age_band: AgeBand | null;
  guardian_consent_at: string | null;
  preferred_language: "auto" | "en" | "fr" | "ar" | "tn";
  level: "beginner" | "intermediate" | "advanced";
  learning_styles: LearningStyle[];
  goals: string | null;
  accessibility: Record<string, unknown>;
  onboarded_at: string | null;
  created_at: string;
}

export type LearningStyle = "visual" | "analogies" | "step_by_step" | "practical" | "repetition" | "direct";

export interface ProgressRow {
  subject_id: string;
  sessions_count: number;
  messages_count: number;
  exercises_completed: number;
  exercises_correct: number;
  last_activity_at: string;
  subjects: { name: string; mentor_id: MentorId } | null;
}

export interface SessionSummary extends SessionRow {
  message_count: number;
}

export interface GuardianLink {
  id: string;
  student_id: string;
  guardian_email: string;
  parent_id: string | null;
  status: "pending" | "active" | "revoked";
  invited_at: string | null;
  linked_at: string | null;
  created_at: string;
}

export interface ChildOverview {
  student_id: string;
  display_name: string;
  age_band: AgeBand;
  linked_at: string;
  member_since: string;
  progress: {
    subject_id: string;
    subject_name: string;
    mentor_id: MentorId;
    sessions: number;
    questions: number;
    exercises_completed: number;
    exercises_correct: number;
    last_activity_at: string;
  }[];
  recent_sessions: {
    mentor_id: MentorId;
    subject: string;
    updated_at: string;
    questions: number;
  }[];
  recent_exercises: {
    mentor_id: MentorId;
    question: string;
    is_correct: boolean | null;
    attempts: number;
    completed_at: string;
  }[];
}
