import { useState, type FormEvent } from "react";
import { CheckCircle2, Lightbulb, Loader2, PencilLine, XCircle } from "lucide-react";
import type { ExerciseView } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge, Input } from "@/components/ui/primitives";
import { MarkdownContent } from "@/components/chat/MarkdownContent";
import { api } from "@/services/api";

/** Answers are checked on the server; the correct answer is never sent to the browser before completion. */
export function ExerciseCard({
  exercise,
  onUpdate,
}: {
  exercise: ExerciseView;
  onUpdate: (e: ExerciseView) => void;
}) {
  const [answer, setAnswer] = useState("");
  const [hintsShown, setHintsShown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "bad" | "info"; text: string } | null>(
    null,
  );
  const done = exercise.status === "completed";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!answer.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const r = await api.grade(exercise.id, answer.trim());
      onUpdate(r.exercise);
      setMessage({
        tone: r.correct === true ? "ok" : r.correct === false ? "bad" : "info",
        text: r.feedback,
      });
    } catch (err) {
      setMessage({
        tone: "bad",
        text: err instanceof Error ? err.message : "Could not check your answer.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="mt-1 rounded-2xl border-2 border-[var(--mentor)]/40 bg-[var(--mentor-soft)]/60 p-4"
      data-testid="exercise-card"
    >
      <div className="flex items-center gap-2">
        <PencilLine className="size-4 text-[var(--mentor-deep)]" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-widest text-[var(--mentor-deep)]">
          Practice exercise
        </span>
        {done && (
          <Badge tone={exercise.is_correct ? "teal" : "terracotta"} className="ms-auto">
            {exercise.is_correct ? "Solved" : "Solution shown"}
          </Badge>
        )}
        {!done && exercise.attempts > 0 && (
          <span className="ms-auto text-xs text-slate-deep">Attempt {exercise.attempts}/3</span>
        )}
      </div>
      <MarkdownContent className="mt-2 font-medium">{exercise.question}</MarkdownContent>

      {exercise.hints.length > 0 && !done && (
        <div className="mt-3 space-y-1.5">
          {exercise.hints.slice(0, hintsShown).map((h, i) => (
            <p key={i} className="flex gap-2 text-sm text-ink/80" dir="auto">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-gold-deep" aria-hidden="true" /> {h}
            </p>
          ))}
          {hintsShown < exercise.hints.length && (
            <button
              type="button"
              className="cursor-pointer text-xs font-medium text-[var(--mentor-deep)] hover:underline"
              onClick={() => setHintsShown((n) => n + 1)}
            >
              Show hint ({hintsShown + 1}/{exercise.hints.length})
            </button>
          )}
        </div>
      )}

      {!done && (
        <form onSubmit={submit} className="mt-3 flex gap-2">
          <Input
            value={answer}
            onChange={(e) => setAnswer(e.target.value.slice(0, 500))}
            placeholder={
              exercise.answer_type === "numeric" ? "Your answer (a number)" : "Your answer"
            }
            aria-label="Your answer"
            dir="auto"
            className="bg-paper"
            disabled={busy}
          />
          <Button type="submit" variant="mentor" disabled={!answer.trim() || busy}>
            {busy ? <Loader2 className="animate-spin" /> : null} Check
          </Button>
        </form>
      )}

      {message && (
        <p
          role="status"
          className={
            message.tone === "ok"
              ? "mt-2 flex items-start gap-1.5 text-sm text-teal-deep"
              : message.tone === "bad"
                ? "mt-2 flex items-start gap-1.5 text-sm text-terracotta-deep"
                : "mt-2 text-sm text-slate-deep"
          }
          data-testid="grade-feedback"
          dir="auto"
        >
          {message.tone === "ok" && (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          )}
          {message.tone === "bad" && (
            <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          )}
          {message.text}
        </p>
      )}

      {done && exercise.answer && (
        <div className="mt-3 rounded-xl bg-paper p-3 text-sm">
          <p>
            Answer: <strong dir="auto">{exercise.answer}</strong>
            {exercise.student_answer && (
              <span className="ms-2 text-slate-deep" dir="auto">
                (you: {exercise.student_answer})
              </span>
            )}
          </p>
          {exercise.explanation && (
            <MarkdownContent className="mt-2 text-sm text-ink/80">
              {exercise.explanation}
            </MarkdownContent>
          )}
          <p className="mt-2 text-[11px] text-slate-deep">
            Checked{" "}
            {exercise.graded_by === "model" ? "by the AI mentor (validated)" : "automatically"}.
          </p>
        </div>
      )}
    </div>
  );
}
