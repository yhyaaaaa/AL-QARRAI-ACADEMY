import { MENTORS } from "@/data/mentors";
import type { ExerciseView, MentorId, ProgressRow, SessionSummary } from "@/types";

export interface MentorProgress {
  mentorId: MentorId;
  sessions: number;
  questions: number;
  exercisesCompleted: number;
  exercisesCorrect: number;
  lastActivity?: string;
}

/** Aggregates the trigger-maintained progress rows (per subject) by mentor. */
export function summarise(
  progress: ProgressRow[],
  sessions: SessionSummary[],
  exercises: ExerciseView[],
) {
  const perMentor: MentorProgress[] = MENTORS.map((m) => {
    const rows = progress.filter((p) => p.subjects?.mentor_id === m.id);
    return {
      mentorId: m.id,
      sessions: rows.reduce((a, r) => a + r.sessions_count, 0),
      questions: rows.reduce((a, r) => a + r.messages_count, 0),
      exercisesCompleted: rows.reduce((a, r) => a + r.exercises_completed, 0),
      exercisesCorrect: rows.reduce((a, r) => a + r.exercises_correct, 0),
      lastActivity: rows
        .map((r) => r.last_activity_at)
        .sort()
        .at(-1),
    };
  });
  const completed = perMentor.reduce((a, p) => a + p.exercisesCompleted, 0);
  const correct = perMentor.reduce((a, p) => a + p.exercisesCorrect, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const activity = days.map((d) => {
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const inDay = (iso?: string | null) => !!iso && new Date(iso) >= d && new Date(iso) < next;
    return {
      date: d,
      count:
        sessions.filter((s) => inDay(s.updated_at)).length +
        exercises.filter((e) => inDay(e.completed_at)).length,
    };
  });

  return {
    totalSessions: sessions.length,
    totalQuestions: perMentor.reduce((a, p) => a + p.questions, 0),
    domainsStudied: perMentor.filter((p) => p.sessions > 0).length,
    exercisesCompleted: completed,
    exercisesOpen: exercises.filter((e) => e.status === "assigned").length,
    accuracy: completed ? Math.round((correct / completed) * 100) : null,
    perMentor,
    activity,
  };
}

/** Transparent rule-based suggestion from stored activity (not AI). */
export function suggestNext(perMentor: MentorProgress[], exercises: ExerciseView[]) {
  const open = exercises.find((e) => e.status === "assigned");
  if (open && open.session_id) {
    return {
      mentorId: open.mentor_id,
      title: "Finish your open exercise",
      detail: open.question,
      href: `/learn/${open.mentor_id}?session=${open.session_id}`,
    };
  }
  const least = [...perMentor].sort(
    (a, b) => a.sessions + a.exercisesCompleted - (b.sessions + b.exercisesCompleted),
  )[0];
  const m = MENTORS.find((x) => x.id === least.mentorId)!;
  return least.sessions === 0
    ? {
        mentorId: m.id,
        title: `Meet ${m.firstName}`,
        detail: `You haven't explored ${m.shortDomain} yet. ${m.tagline}`,
        href: `/learn/${m.id}`,
      }
    : {
        mentorId: m.id,
        title: `Practise with ${m.firstName}`,
        detail: `${m.shortDomain} is your least-practised area. A quick exercise keeps it fresh.`,
        href: `/learn/${m.id}?exercise=1`,
      };
}
