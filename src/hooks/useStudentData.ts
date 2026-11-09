import { useEffect, useState } from "react";
import { data } from "@/services/data";
import type { ExerciseView, ProgressRow, SessionSummary } from "@/types";

export interface StudentData {
  sessions: SessionSummary[];
  exercises: ExerciseView[];
  progress: ProgressRow[];
  loading: boolean;
  error: string | null;
}

/** Everything the dashboard and progress pages need, straight from the database. */
export function useStudentData(): StudentData {
  const [state, setState] = useState<StudentData>({
    sessions: [],
    exercises: [],
    progress: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([data.sessions(), data.exercises(), data.progress()])
      .then(([sessions, exercises, progress]) => {
        if (!cancelled) setState({ sessions, exercises, progress, loading: false, error: null });
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
