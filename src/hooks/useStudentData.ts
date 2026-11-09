import { useEffect, useState } from "react";
import { data } from "@/services/data";
import { learn } from "@/services/learn";
import type { LearningStats } from "@/types/learning";
import type { ExerciseView, ProgressRow, SessionSummary } from "@/types";

export interface StudentData {
  sessions: SessionSummary[];
  exercises: ExerciseView[];
  progress: ProgressRow[];
  stats: LearningStats | null;
  loading: boolean;
  error: string | null;
}

/** Everything the dashboard and progress pages need, straight from the database. */
export function useStudentData(): StudentData {
  const [state, setState] = useState<StudentData>({
    sessions: [],
    exercises: [],
    progress: [],
    stats: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([data.sessions(), data.exercises(), data.progress(), learn.stats()])
      .then(([sessions, exercises, progress, stats]) => {
        if (!cancelled) setState({ sessions, exercises, progress, stats, loading: false, error: null });
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setState((s) => ({
            ...s,
            loading: false,
            error: e instanceof Error ? e.message : String(e),
          }));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
