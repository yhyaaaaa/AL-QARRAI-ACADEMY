import { useEffect, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, CheckCircle2, GripVertical, Lightbulb, Loader2, Star, Trophy, XCircle } from "lucide-react";
import type { MentorProfile } from "@/data/mentors";
import { Button } from "@/components/ui/button";
import { Badge, Card, ProgressBar } from "@/components/ui/primitives";
import { MarkdownContent } from "@/components/chat/MarkdownContent";
import { useErrorMessage, useT } from "@/i18n/strings";
import { learn } from "@/services/learn";
import type { CheckResult, GameChallenge, GameContent, LearningItem } from "@/types/learning";
import { ActivityFrame } from "../ActivityFrame";
import type { Experience } from "../experiences";
import { useCharacterState, useFeedbackSound } from "../hooks";
import { useActivity } from "../useActivity";
import { ErrorState, ModuleShell } from "../ui";
import { frameProps } from "../frameProps";
import { cn } from "@/lib/utils";

export function GameModule({ mentor, experience }: { mentor: MentorProfile; experience: Experience }) {
  const act = useActivity(mentor.id, "game");
  const [checking, setChecking] = useState(false);
  const character = useCharacterState({ pending: act.pending || checking, typing: false });
  const level = act.item?.options.level ?? 1;

  return (
    <ModuleShell mentor={mentor} experience={experience} state={character.state} topic={act.item?.topic}>
      <ActivityFrame
        {...frameProps(act)}
        mentor={mentor}
        experience={experience}
        onGenerate={(topic) => void act.generate(topic, { level: 1 })}
      >
        {(item) => (
          <GameLevel
            key={item.id}
            item={item as LearningItem<"game">}
            onChecking={setChecking}
            onAnswered={character.answered}
            onNextLevel={() => void act.generate(item.topic, { level: level + 1 })}
          />
        )}
      </ActivityFrame>
    </ModuleShell>
  );
}

function GameLevel({
  item,
  onChecking,
  onAnswered,
  onNextLevel,
}: {
  item: LearningItem<"game">;
  onChecking: (b: boolean) => void;
  onAnswered: () => void;
  onNextLevel: () => void;
}) {
  const t = useT();
  const errorMessage = useErrorMessage();
  const sound = useFeedbackSound();
  const c = item.content as GameContent;
  const level = item.options.level ?? 1;
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Record<number, CheckResult>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    learn
      .attempts(item.id)
      .then((rows) => {
        const r: Record<number, CheckResult> = {};
        for (const row of rows) {
          if (r[row.part]?.correct) continue;
          const tries = rows.filter((x) => x.part === row.part).length;
          r[row.part] = { correct: row.is_correct, explanation: null, correctAnswer: null, points: row.points, triesLeft: Math.max(0, 2 - tries) };
        }
        setResults(r);
        const open = c.challenges.findIndex((_, i) => !(r[i]?.correct || r[i]?.triesLeft === 0));
        setIndex(open === -1 ? c.challenges.length : open);
      })
      .catch(() => undefined);
  }, [item.id, c.challenges]);

  const score = Object.values(results).reduce((a, r) => a + (r.points ?? 0), 0);
  const finished = index >= c.challenges.length;

  async function submit(answer: number | number[], hintUsed = false) {
    setBusy(true);
    setError(null);
    onChecking(true);
    try {
      const r = await learn.check(item.id, index, answer, hintUsed);
      setResults((p) => ({ ...p, [index]: r }));
      if (r.correct !== null) sound(r.correct ? "correct" : "incorrect");
      onAnswered();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
      onChecking(false);
    }
  }

  return (
    <div className="space-y-4" data-testid="game-view">
      <Card className="flex flex-wrap items-center gap-4 p-5">
        <div className="flex-1">
          <p className="text-sm text-slate-deep">{t("common.level", { n: level })}</p>
          <h2 className="font-display text-2xl" dir="auto">
            {c.title}
          </h2>
          {c.story && (
            <p className="text-sm text-ink/80" dir="auto">
              {c.story}
            </p>
          )}
        </div>
        <div className="text-end">
          <p className="text-sm text-slate-deep">{t("game.score")}</p>
          <p className="flex items-center gap-1 font-display text-3xl" aria-live="polite" data-testid="game-score">
            <Star className="size-6 fill-gold text-gold-deep" aria-hidden="true" /> {score}
          </p>
        </div>
        <ProgressBar value={(Math.min(index, c.challenges.length) / c.challenges.length) * 100} color="var(--mentor)" />
      </Card>

      {finished ? (
        <Card className="flex flex-col items-center gap-3 p-8 text-center" data-testid="level-complete">
          <Trophy className="size-12 text-gold-deep" aria-hidden="true" />
          <p className="font-display text-3xl">{t("game.levelDone", { n: level })}</p>
          <p>{t("common.points", { n: score })}</p>
          <Button variant="mentor" size="lg" onClick={onNextLevel} data-testid="next-level">
            {t("game.nextLevel")} ({t("common.level", { n: level + 1 })})
          </Button>
        </Card>
      ) : (
        <Card className="p-5 sm:p-6">
          <p className="text-sm text-slate-deep">{t("game.challenge", { n: index + 1, total: c.challenges.length })}</p>
          <Challenge
            key={index}
            challenge={c.challenges[index]}
            result={results[index]}
            busy={busy}
            onSubmit={submit}
          />
          {error && <div className="mt-3"><ErrorState message={error} /></div>}
          {results[index] && (results[index].correct || results[index].triesLeft === 0) && (
            <Button className="mt-4" variant="mentor" onClick={() => setIndex(index + 1)} data-testid="challenge-next">
              {t("common.next")}
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}

function Challenge({
  challenge,
  result,
  busy,
  onSubmit,
}: {
  challenge: GameChallenge;
  result?: CheckResult;
  busy: boolean;
  onSubmit: (answer: number | number[], hintUsed?: boolean) => void;
}) {
  const done = Boolean(result && (result.correct || result.triesLeft === 0));
  return (
    <div className="mt-2 space-y-4">
      {challenge.type === "match" && <MatchChallenge c={challenge} done={done} busy={busy} onSubmit={onSubmit} />}
      {challenge.type === "sequence" && <SequenceChallenge c={challenge} done={done} busy={busy} onSubmit={onSubmit} />}
      {challenge.type === "choice" && <ChoiceChallenge c={challenge} done={done} busy={busy} onSubmit={onSubmit} />}
      {result && <ResultBanner result={result} />}
    </div>
  );
}

function ResultBanner({ result }: { result: CheckResult }) {
  const t = useT();
  return (
    <div
      role="status"
      className={cn("rounded-2xl border p-4", result.correct ? "border-teal/50 bg-teal/10" : "border-terracotta/50 bg-terracotta/10")}
      data-testid="challenge-feedback"
    >
      <p className="flex items-center gap-2 font-semibold">
        {result.correct ? (
          <CheckCircle2 className="size-5 text-teal-deep" aria-hidden="true" />
        ) : (
          <XCircle className="size-5 text-terracotta-deep" aria-hidden="true" />
        )}
        {result.correct ? t("quiz.correct") : t("quiz.incorrect")}
        {result.points > 0 && <Badge tone="gold">{t("game.reward", { n: result.points })}</Badge>}
      </p>
      {!result.correct && result.triesLeft > 0 && <p className="mt-1 text-sm">{t("quiz.triesLeft")}</p>}
      {result.explanation && <MarkdownContent className="mt-2 text-sm">{result.explanation}</MarkdownContent>}
    </div>
  );
}

function CheckButton({ disabled, busy, onClick }: { disabled: boolean; busy: boolean; onClick: () => void }) {
  const t = useT();
  return (
    <Button variant="mentor" disabled={disabled || busy} onClick={onClick} data-testid="challenge-check">
      {busy && <Loader2 className="animate-spin" />} {t("game.check")}
    </Button>
  );
}

// ── match: select a left item, then its partner on the right (no dragging needed) ──
function MatchChallenge({
  c,
  done,
  busy,
  onSubmit,
}: {
  c: Extract<GameChallenge, { type: "match" }>;
  done: boolean;
  busy: boolean;
  onSubmit: (a: number[]) => void;
}) {
  const t = useT();
  const [pairs, setPairs] = useState<(number | null)[]>(() => c.left.map(() => null));
  const [active, setActive] = useState<number | null>(0);
  const used = new Set(pairs.filter((p): p is number => p !== null));
  const PAIR_COLOURS = ["#2B6159", "#9C4430", "#7A5A22", "#4A5B6E", "#142337", "#6B4E9B"];

  return (
    <div>
      <p className="font-medium" dir="auto">
        {c.instructions}
      </p>
      <p className="text-sm text-slate-deep">{t("game.matchHelp")}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <ul className="space-y-2">
          {c.left.map((l, i) => (
            <li key={i}>
              <button
                type="button"
                disabled={done}
                onClick={() => setActive(i)}
                aria-pressed={active === i}
                className={cn(
                  "flex min-h-12 w-full cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2 text-start text-sm",
                  active === i ? "border-[var(--mentor-deep)] bg-[var(--mentor-soft)]" : "border-ink/15 bg-paper",
                )}
              >
                {pairs[i] !== null && (
                  <span className="size-3 shrink-0 rounded-full" style={{ background: PAIR_COLOURS[i % PAIR_COLOURS.length] }} aria-hidden="true" />
                )}
                <span dir="auto">{l}</span>
                {pairs[i] !== null && <span className="sr-only">→ {c.right[pairs[i]!]}</span>}
              </button>
            </li>
          ))}
        </ul>
        <ul className="space-y-2">
          {c.right.map((r, j) => {
            const owner = pairs.indexOf(j);
            return (
              <li key={j}>
                <button
                  type="button"
                  disabled={done || active === null}
                  onClick={() => {
                    if (active === null) return;
                    setPairs((p) => p.map((v, i) => (i === active ? j : v === j ? null : v)));
                    const nextOpen = pairs.findIndex((v, i) => v === null && i !== active);
                    setActive(nextOpen === -1 ? null : nextOpen);
                  }}
                  className={cn(
                    "flex min-h-12 w-full cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2 text-start text-sm disabled:cursor-default",
                    owner !== -1 ? "border-ink/30 bg-ink/5" : "border-ink/15 bg-paper hover:border-[var(--mentor)]",
                  )}
                >
                  {owner !== -1 && (
                    <span className="size-3 shrink-0 rounded-full" style={{ background: PAIR_COLOURS[owner % PAIR_COLOURS.length] }} aria-hidden="true" />
                  )}
                  <span dir="auto">{r}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {!done && (
        <div className="mt-4">
          <CheckButton disabled={used.size < c.left.length} busy={busy} onClick={() => onSubmit(pairs as number[])} />
        </div>
      )}
    </div>
  );
}

// ── sequence: drag OR use the arrow buttons / keyboard sorting ──
function SequenceChallenge({
  c,
  done,
  busy,
  onSubmit,
}: {
  c: Extract<GameChallenge, { type: "sequence" }>;
  done: boolean;
  busy: boolean;
  onSubmit: (a: number[]) => void;
}) {
  const t = useT();
  const [order, setOrder] = useState<number[]>(() => c.steps.map((_, i) => i));
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    setOrder((o) => arrayMove(o, from, to));
  };
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    setOrder((o) => arrayMove(o, o.indexOf(Number(e.active.id)), o.indexOf(Number(e.over!.id))));
  };
  return (
    <div>
      <p className="font-medium" dir="auto">
        {c.instructions}
      </p>
      <p className="text-sm text-slate-deep">{t("game.sequenceHelp")}</p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        accessibility={{
          announcements: {
            onDragStart: ({ active }) => `${c.steps[Number(active.id)]}`,
            onDragOver: ({ over }) => (over ? `${order.indexOf(Number(over.id)) + 1}` : ""),
            onDragEnd: ({ over }) => (over ? `${order.indexOf(Number(over.id)) + 1}` : ""),
            onDragCancel: () => "",
          },
        }}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ol className="mt-3 space-y-2">
            {order.map((stepIdx, pos) => (
              <SortableStep
                key={stepIdx}
                id={stepIdx}
                label={c.steps[stepIdx]}
                position={pos}
                total={order.length}
                disabled={done}
                onUp={() => move(pos, pos - 1)}
                onDown={() => move(pos, pos + 1)}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {!done && (
        <div className="mt-4">
          <CheckButton disabled={false} busy={busy} onClick={() => onSubmit(order)} />
        </div>
      )}
    </div>
  );
}

function SortableStep({
  id,
  label,
  position,
  total,
  disabled,
  onUp,
  onDown,
}: {
  id: number;
  label: string;
  position: number;
  total: number;
  disabled: boolean;
  onUp: () => void;
  onDown: () => void;
}) {
  const t = useT();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-center gap-2 rounded-xl border-2 border-ink/15 bg-paper px-2 py-1.5", isDragging && "z-10 border-[var(--mentor)] shadow-lg")}
    >
      <span className="w-6 text-center font-display text-lg text-[var(--mentor-deep)]">{position + 1}</span>
      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={disabled}
        className="cursor-grab rounded-md p-1 text-slate-deep hover:bg-ink/5 disabled:cursor-default"
        aria-label={`${label}`}
      >
        <GripVertical className="size-4" aria-hidden="true" />
      </button>
      <span className="flex-1 text-sm" dir="auto">
        {label}
      </span>
      <button type="button" onClick={onUp} disabled={disabled || position === 0} aria-label={`${t("game.moveUp")}: ${label}`} className="rounded-md p-2 hover:bg-ink/5 disabled:opacity-30">
        <ArrowUp className="size-4" aria-hidden="true" />
      </button>
      <button type="button" onClick={onDown} disabled={disabled || position === total - 1} aria-label={`${t("game.moveDown")}: ${label}`} className="rounded-md p-2 hover:bg-ink/5 disabled:opacity-30">
        <ArrowDown className="size-4" aria-hidden="true" />
      </button>
    </li>
  );
}

function ChoiceChallenge({
  c,
  done,
  busy,
  onSubmit,
}: {
  c: Extract<GameChallenge, { type: "choice" }>;
  done: boolean;
  busy: boolean;
  onSubmit: (a: number, hintUsed?: boolean) => void;
}) {
  const t = useT();
  const [selected, setSelected] = useState<number | null>(null);
  const [hint, setHint] = useState(false);
  return (
    <div>
      <MarkdownContent className="text-lg font-medium">{c.prompt}</MarkdownContent>
      <div role="radiogroup" className="mt-3 grid gap-2 sm:grid-cols-2">
        {c.options.map((o, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={selected === i}
            disabled={done}
            onClick={() => setSelected(i)}
            className={cn(
              "min-h-12 cursor-pointer rounded-xl border-2 px-4 py-2 text-start",
              selected === i ? "border-[var(--mentor-deep)] bg-[var(--mentor-soft)]" : "border-ink/15 bg-paper hover:border-[var(--mentor)]",
            )}
          >
            <MarkdownContent>{o}</MarkdownContent>
          </button>
        ))}
      </div>
      {c.hint && !done && (
        <div className="mt-3">
          {hint ? (
            <p className="flex gap-2 rounded-xl bg-gold/15 p-3 text-sm" dir="auto">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-gold-deep" aria-hidden="true" /> {c.hint}
            </p>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setHint(true)}>
              <Lightbulb /> {t("quiz.hint")}
            </Button>
          )}
        </div>
      )}
      {!done && (
        <div className="mt-4">
          <CheckButton disabled={selected === null} busy={busy} onClick={() => onSubmit(selected!, hint)} />
        </div>
      )}
    </div>
  );
}
