import { useEffect, useState } from "react";
import { CheckCircle2, Lightbulb, Loader2, Trophy, XCircle } from "lucide-react";
import type { MentorProfile } from "@/data/mentors";
import { Button } from "@/components/ui/button";
import { Card, Input, ProgressBar } from "@/components/ui/primitives";
import { MarkdownContent } from "@/components/chat/MarkdownContent";
import { useErrorMessage, useT } from "@/i18n/strings";
import { learn } from "@/services/learn";
import type { CheckResult, LearningItem, QuizContent } from "@/types/learning";
import { ActivityFrame } from "../ActivityFrame";
import type { Experience } from "../experiences";
import { useCharacterState, useFeedbackSound } from "../hooks";
import { useActivity } from "../useActivity";
import { ErrorState, ModuleShell, ReadAloudButton, Segmented } from "../ui";
import { cn } from "@/lib/utils";

type Difficulty = "easy" | "medium" | "hard";

export function QuizModule({ mentor, experience }: { mentor: MentorProfile; experience: Experience }) {
  const t = useT();
  const act = useActivity(mentor.id, "quiz");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [count, setCount] = useState("5");
  const [checking, setChecking] = useState(false);
  const character = useCharacterState({ pending: act.pending || checking, typing: false });

  return (
    <ModuleShell mentor={mentor} experience={experience} state={character.state} topic={act.item?.topic}>
      <ActivityFrame
        mentor={mentor}
        experience={experience}
        item={act.item}
        history={act.history}
        pending={act.pending}
        loadingItem={act.loadingItem}
        error={act.error}
        onNew={act.reset}
        onGenerate={(topic) => void act.generate(topic, { difficulty, count: Number(count) })}
        options={
          <div className="flex flex-wrap gap-6">
            <Segmented
              label={t("quiz.difficulty")}
              value={difficulty}
              onChange={setDifficulty}
              options={[
                { value: "easy", label: t("quiz.easy") },
                { value: "medium", label: t("quiz.medium") },
                { value: "hard", label: t("quiz.hard") },
              ]}
            />
            <Segmented
              label={t("quiz.count")}
              value={count}
              onChange={setCount}
              options={["3", "5", "8"].map((v) => ({ value: v, label: v }))}
            />
          </div>
        }
      >
        {(item) => (
          <QuizRunner
            key={item.id}
            item={item as LearningItem<"quiz">}
            onChecking={setChecking}
            onAnswered={character.answered}
          />
        )}
      </ActivityFrame>
    </ModuleShell>
  );
}

interface PartState {
  result?: CheckResult;
  hintShown?: boolean;
}

export function QuizRunner({
  item,
  onChecking,
  onAnswered,
  onFinished,
}: {
  item: LearningItem<"quiz"> | LearningItem<"diagnostic">;
  onChecking?: (b: boolean) => void;
  onAnswered?: () => void;
  onFinished?: (correct: number, total: number) => void;
}) {
  const t = useT();
  const errorMessage = useErrorMessage();
  const sound = useFeedbackSound();
  const questions = (item.content as QuizContent).questions;
  const [index, setIndex] = useState(0);
  const [parts, setParts] = useState<Record<number, PartState>>({});
  const [answer, setAnswer] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  // resume an earlier quiz from stored attempts
  useEffect(() => {
    let cancelled = false;
    learn
      .attempts(item.id)
      .then((rows) => {
        if (cancelled || rows.length === 0) return;
        const restored: Record<number, PartState> = {};
        for (const r of rows) {
          const prev = restored[r.part]?.result;
          if (prev?.correct) continue;
          const tries = rows.filter((x) => x.part === r.part).length;
          restored[r.part] = {
            result: { correct: r.is_correct, explanation: null, correctAnswer: null, points: r.points, triesLeft: Math.max(0, 2 - tries) },
          };
        }
        setParts(restored);
        const firstOpen = questions.findIndex((_, i) => !(restored[i]?.result?.correct || restored[i]?.result?.triesLeft === 0));
        if (firstOpen === -1) setFinished(true);
        else setIndex(firstOpen);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [item.id, questions]);

  const q = questions[index];
  const state = parts[index] ?? {};
  const done = Boolean(state.result && (state.result.correct || state.result.triesLeft === 0));
  const correctCount = Object.values(parts).filter((p) => p.result?.correct).length;

  async function check() {
    const value: string | number | boolean = q.type === "mc" ? Number(answer) : q.type === "tf" ? answer === "true" : answer.trim();
    setBusy(true);
    setError(null);
    onChecking?.(true);
    try {
      const r = await learn.check(item.id, index, value, Boolean(state.hintShown));
      setParts((p) => ({ ...p, [index]: { ...p[index], result: r } }));
      if (r.correct !== null) sound(r.correct ? "correct" : "incorrect");
      onAnswered?.();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
      onChecking?.(false);
    }
  }

  function next() {
    setAnswer("");
    if (index + 1 < questions.length) setIndex(index + 1);
    else {
      setFinished(true);
      onFinished?.(correctCount, questions.length);
    }
  }

  const formatAnswer = (a: unknown) => {
    if (q.type === "mc" && typeof a === "number") return q.options[a] ?? String(a);
    if (q.type === "tf") return a ? t("quiz.true") : t("quiz.false");
    return String(a);
  };

  if (finished) {
    return (
      <Card className="flex flex-col items-center gap-3 p-8 text-center" data-testid="quiz-result">
        <Trophy className="size-10 text-gold-deep" aria-hidden="true" />
        <p className="font-display text-3xl">{t("quiz.result", { correct: correctCount, total: questions.length })}</p>
        <ProgressBar value={(correctCount / questions.length) * 100} className="max-w-sm" color="var(--mentor)" />
        <p className="text-sm text-slate-deep">{t("quiz.resultSaved")}</p>
      </Card>
    );
  }

  return (
    <Card className="p-5 sm:p-6" data-testid="quiz-runner">
      <div className="flex items-center justify-between gap-3 text-sm text-slate-deep">
        <span>{t("quiz.question", { n: index + 1, total: questions.length })}</span>
        <span>{t("common.points", { n: Object.values(parts).reduce((a, p) => a + (p.result?.points ?? 0), 0) })}</span>
      </div>
      <ProgressBar value={(index / questions.length) * 100} className="mt-2" color="var(--mentor)" />

      <div className="mt-5 flex items-start justify-between gap-2">
        <MarkdownContent className="text-lg font-medium">{q.prompt}</MarkdownContent>
        <ReadAloudButton id={`q-${item.id}-${index}`} text={q.prompt} />
      </div>

      <form
        className="mt-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (answer !== "" && !busy && !done) void check();
        }}
      >
        {q.type === "mc" && (
          <div role="radiogroup" aria-label={t("quiz.yourAnswer")} className="grid gap-2">
            {q.options.map((o, i) => (
              <ChoiceButton key={i} selected={answer === String(i)} disabled={done || busy} onSelect={() => setAnswer(String(i))}>
                <MarkdownContent>{o}</MarkdownContent>
              </ChoiceButton>
            ))}
          </div>
        )}
        {q.type === "tf" && (
          <div role="radiogroup" aria-label={t("quiz.yourAnswer")} className="grid grid-cols-2 gap-2">
            {(["true", "false"] as const).map((v) => (
              <ChoiceButton key={v} selected={answer === v} disabled={done || busy} onSelect={() => setAnswer(v)}>
                {v === "true" ? t("quiz.true") : t("quiz.false")}
              </ChoiceButton>
            ))}
          </div>
        )}
        {q.type === "short" && (
          <Input
            value={answer}
            onChange={(e) => setAnswer(e.target.value.slice(0, 300))}
            aria-label={t("quiz.yourAnswer")}
            placeholder={t("quiz.yourAnswer")}
            disabled={done || busy}
            dir="auto"
            className="h-12 text-base"
          />
        )}

        {q.hint && !done && (
          <div>
            {state.hintShown ? (
              <p className="flex gap-2 rounded-xl bg-gold/15 p-3 text-sm" dir="auto">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-gold-deep" aria-hidden="true" /> {q.hint}
              </p>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setParts((p) => ({ ...p, [index]: { ...p[index], hintShown: true } }))}
              >
                <Lightbulb /> {t("quiz.hint")}
              </Button>
            )}
          </div>
        )}

        {error && <ErrorState message={error} onRetry={() => void check()} />}

        {state.result && (
          <div
            role="status"
            className={cn(
              "rounded-2xl border p-4",
              state.result.correct ? "border-teal/50 bg-teal/10" : "border-terracotta/50 bg-terracotta/10",
            )}
            data-testid="quiz-feedback"
          >
            <p className="flex items-center gap-2 font-semibold">
              {state.result.correct ? (
                <CheckCircle2 className="size-5 text-teal-deep" aria-hidden="true" />
              ) : (
                <XCircle className="size-5 text-terracotta-deep" aria-hidden="true" />
              )}
              {state.result.correct === null
                ? t("quiz.uncheckable")
                : state.result.correct
                  ? `${t("quiz.correct")} ${state.result.points ? t("game.reward", { n: state.result.points }) : ""}`
                  : t("quiz.incorrect")}
            </p>
            {!state.result.correct && state.result.triesLeft > 0 && <p className="mt-1 text-sm">{t("quiz.triesLeft")}</p>}
            {state.result.correctAnswer !== null && state.result.correctAnswer !== undefined && !state.result.correct && (
              <p className="mt-2 text-sm" dir="auto">
                {t("quiz.answerWas", { answer: formatAnswer(state.result.correctAnswer) })}
              </p>
            )}
            {state.result.explanation && (
              <div className="mt-2">
                <p className="text-sm font-semibold">{t("quiz.why")}</p>
                <MarkdownContent className="text-sm">{state.result.explanation}</MarkdownContent>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {!done && (
            <Button type="submit" variant="mentor" disabled={answer === "" || busy} data-testid="quiz-check">
              {busy && <Loader2 className="animate-spin" />} {t("quiz.check")}
            </Button>
          )}
          {done && (
            <Button type="button" variant="mentor" onClick={next} data-testid="quiz-next">
              {index + 1 < questions.length ? t("quiz.next") : t("quiz.finish")}
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}

function ChoiceButton({
  selected,
  disabled,
  onSelect,
  children,
}: {
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "min-h-12 cursor-pointer rounded-xl border-2 px-4 py-2 text-start transition-colors disabled:cursor-default",
        selected ? "border-[var(--mentor-deep)] bg-[var(--mentor-soft)]" : "border-ink/15 bg-paper hover:border-[var(--mentor)]",
      )}
    >
      {children}
    </button>
  );
}
