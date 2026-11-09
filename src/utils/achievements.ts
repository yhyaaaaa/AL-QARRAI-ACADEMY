import type { StringKey } from "@/i18n/strings";
import type { LearningStats } from "@/types/learning";
import type { ProgressRow, SessionSummary } from "@/types";

export interface Achievement {
  id: string;
  name: StringKey;
  desc: StringKey;
  earned: boolean;
  /** 0–1 progress towards the badge */
  progress: number;
}

/** Every achievement is derived from stored activity — nothing is granted by the client. */
export function computeAchievements(stats: LearningStats | null, progress: ProgressRow[], sessions: SessionSummary[]): Achievement[] {
  const questions = progress.reduce((a, p) => a + p.messages_count, 0);
  const items = Object.values(stats?.items_by_kind ?? {}).reduce((a, n) => a + (n ?? 0), 0);
  const mentorsUsed = new Set([
    ...Object.keys(stats?.items_by_mentor ?? {}),
    ...sessions.map((s) => s.mentor_id),
  ]).size;
  const perfectQuiz = (stats?.quizzes ?? []).some((q) => q.total > 0 && q.correct === q.total);
  const bestTeach = Math.max(0, ...(stats?.teachback ?? []).map((t) => Number(t.score)));
  const known = stats?.flashcards.known ?? 0;
  const bestLevel = Math.max(0, ...Object.values(stats?.game_levels_by_mentor ?? {}).map((n) => n ?? 0));
  const days = stats?.active_days ?? 0;
  const ratio = (v: number, goal: number) => Math.min(1, v / goal);

  return [
    { id: "first_step", name: "ach.first_step", desc: "ach.first_step.desc", earned: items + questions > 0, progress: items + questions > 0 ? 1 : 0 },
    { id: "curious", name: "ach.curious", desc: "ach.curious.desc", earned: questions >= 10, progress: ratio(questions, 10) },
    { id: "quiz_ace", name: "ach.quiz_ace", desc: "ach.quiz_ace.desc", earned: perfectQuiz, progress: perfectQuiz ? 1 : 0 },
    { id: "explorer", name: "ach.explorer", desc: "ach.explorer.desc", earned: mentorsUsed >= 3, progress: ratio(mentorsUsed, 3) },
    { id: "teacher", name: "ach.teacher", desc: "ach.teacher.desc", earned: bestTeach >= 3, progress: ratio(bestTeach, 3) },
    { id: "memory", name: "ach.memory", desc: "ach.memory.desc", earned: known >= 20, progress: ratio(known, 20) },
    { id: "player", name: "ach.player", desc: "ach.player.desc", earned: bestLevel >= 3, progress: ratio(bestLevel, 3) },
    { id: "regular", name: "ach.regular", desc: "ach.regular.desc", earned: days >= 5, progress: ratio(days, 5) },
  ];
}
