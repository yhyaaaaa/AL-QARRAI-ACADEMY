import type { MentorId } from "../schemas.ts";

/** One mentor = one configuration. All mentors share the same tutoring engine. */
export interface MentorPromptConfig {
  id: MentorId;
  name: string;
  nameAr: string;
  domain: string;
  subjects: string[];
  personality: string[];
  methodology: string[];
  communicationStyle: string[];
  learningBehavior: string[];
  constraints: string[];
  /** Short line used by the validator to check personality consistency. */
  voiceSummary: string;
  /** Mentor-voiced message used when no reliable answer could be validated. */
  fallbackMessage: Record<"en" | "fr" | "ar", string>;
}
