import { useEffect, useState } from "react";
import { CheckCircle2, Lightbulb, Loader2, PencilLine, Sparkles, Wrench } from "lucide-react";
import type { MentorProfile } from "@/data/mentors";
import { Button } from "@/components/ui/button";
import { Badge, Card, Textarea } from "@/components/ui/primitives";
import { MarkdownContent } from "@/components/chat/MarkdownContent";
import { useErrorMessage, useT, type StringKey } from "@/i18n/strings";
import { learn } from "@/services/learn";
import type { LearningItem, TeachBackContent, TeachBackEvaluation } from "@/types/learning";
import { ActivityFrame } from "../ActivityFrame";
import type { Experience } from "../experiences";
import { useCharacterState } from "../hooks";
import { useActivity } from "../useActivity";
import { ErrorState, ModuleShell, ReadAloudButton } from "../ui";
import { frameProps } from "../frameProps";

const LEVEL_KEY: StringKey[] = ["teach.level0", "teach.level1", "teach.level2", "teach.level3"];

export function TeachBackModule({ mentor, experience }: { mentor: MentorProfile; experience: Experience }) {
  const act = useActivity(mentor.id, "teachback");
  const [typing, setTyping] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const character = useCharacterState({ pending: act.pending || evaluating, typing });
  return (
    <ModuleShell mentor={mentor} experience={experience} state={character.state} topic={act.item?.topic}>
      <ActivityFrame {...frameProps(act)} mentor={mentor} experience={experience} onGenerate={(topic) => void act.generate(topic)}>
        {(item) => (
          <TeachBack
            key={item.id}
            item={item as LearningItem<"teachback">}
            mentor={mentor}
            onTyping={setTyping}
            onEvaluating={setEvaluating}
            onAnswered={character.answered}
          />
        )}
      </ActivityFrame>
    </ModuleShell>
  );
}

function TeachBack({
  item,
  mentor,
  onTyping,
  onEvaluating,
  onAnswered,
}: {
  item: LearningItem<"teachback">;
  mentor: MentorProfile;
  onTyping: (b: boolean) => void;
  onEvaluating: (b: boolean) => void;
  onAnswered: () => void;
}) {
  const t = useT();
  const errorMessage = useErrorMessage();
  const c = item.content as TeachBackContent;
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{ attempt: number; evaluation: TeachBackEvaluation; points: number }[]>([]);

  useEffect(() => {
    learn
      .attempts(item.id)
      .then((rows) =>
        setResults(
          rows
            .filter((r) => r.feedback && "feedback" in r.feedback)
            .map((r, i) => ({ attempt: i + 1, evaluation: r.feedback as TeachBackEvaluation, points: r.points })),
        ),
      )
      .catch(() => undefined);
  }, [item.id]);

  async function submit() {
    setBusy(true);
    setError(null);
    onEvaluating(true);
    try {
      const r = await learn.teachBack(item.id, text.trim());
      setResults((prev) => [...prev, { attempt: r.attempt, evaluation: r.evaluation, points: r.points }]);
      onAnswered();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
      onEvaluating(false);
    }
  }

  const latest = results.at(-1);

  return (
    <div className="space-y-5" data-testid="teachback-view">
      <Card className="p-6">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-display text-2xl">{mentor.name}</h2>
          <ReadAloudButton id={`tb-${item.id}`} text={`${c.introduction} ${c.prompt}`} />
        </div>
        <MarkdownContent className="mt-2 max-w-prose text-base">{c.introduction}</MarkdownContent>
        <p className="mt-4 rounded-2xl bg-[var(--mentor-soft)] p-4 font-medium" dir="auto">
          <Sparkles className="me-2 inline size-4 text-[var(--mentor-deep)]" aria-hidden="true" />
          {c.prompt}
        </p>
      </Card>

      {latest && <Evaluation result={latest} />}

      <Card className="p-6">
        <label htmlFor="teachback-text" className="flex items-center gap-2 font-display text-xl">
          <PencilLine className="size-5 text-[var(--mentor-deep)]" aria-hidden="true" /> {t("teach.yourTurn")}
        </label>
        <Textarea
          id="teachback-text"
          rows={6}
          value={text}
          maxLength={2000}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => onTyping(true)}
          onBlur={() => onTyping(false)}
          placeholder={t("teach.placeholder")}
          dir="auto"
          className="mt-3 text-base"
          data-testid="teachback-input"
        />
        <div className="mt-1 text-end text-xs text-slate-deep">{text.length}/2000</div>
        {error && <ErrorState message={error} onRetry={() => void submit()} />}
        <Button
          className="mt-3"
          variant="mentor"
          disabled={text.trim().length < 15 || busy}
          onClick={() => void submit()}
          data-testid="teachback-submit"
        >
          {busy && <Loader2 className="animate-spin" />}
          {busy ? t("teach.evaluating", { name: mentor.name }) : latest ? t("teach.again") : t("teach.submit", { name: mentor.name })}
        </Button>
      </Card>

      {results.length > 1 && (
        <ol className="flex flex-wrap gap-2" aria-label={t("a11y.attempts")}>
          {results.map((r) => (
            <li key={r.attempt}>
              <Badge tone={r.evaluation.understanding >= 2 ? "teal" : "gold"}>
                {t("teach.attempt", { n: r.attempt })}: {t(LEVEL_KEY[r.evaluation.understanding])}
              </Badge>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Evaluation({ result }: { result: { evaluation: TeachBackEvaluation; points: number } }) {
  const t = useT();
  const e = result.evaluation;
  return (
    <Card className="space-y-4 border-[var(--mentor)] p-6" role="status" data-testid="teachback-evaluation">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2.5 w-8 rounded-full"
              style={{ background: i < e.understanding ? "var(--mentor-deep)" : "rgb(20 35 55 / 0.12)" }}
            />
          ))}
        </div>
        <p className="font-display text-2xl">{t(LEVEL_KEY[e.understanding])}</p>
        {result.points > 0 && <Badge tone="gold">{t("game.reward", { n: result.points })}</Badge>}
      </div>
      <MarkdownContent className="text-base">{e.feedback}</MarkdownContent>
      <div className="grid gap-4 md:grid-cols-2">
        {e.correctIdeas.length > 0 && (
          <List title={t("teach.right")} items={e.correctIdeas} icon={<CheckCircle2 className="size-4 text-teal-deep" aria-hidden="true" />} />
        )}
        {e.missingIdeas.length > 0 && (
          <List title={t("teach.missing")} items={e.missingIdeas} icon={<Lightbulb className="size-4 text-gold-deep" aria-hidden="true" />} />
        )}
        {e.misconceptions.length > 0 && (
          <List title={t("teach.misconceptions")} items={e.misconceptions} icon={<Wrench className="size-4 text-terracotta-deep" aria-hidden="true" />} />
        )}
      </div>
      {e.nextStep && (
        <p className="rounded-2xl bg-ink/5 p-4 text-sm" dir="auto">
          <strong>{t("teach.next")}:</strong> {e.nextStep}
        </p>
      )}
    </Card>
  );
}

function List({ title, items, icon }: { title: string; items: string[]; icon: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-1 space-y-1">
        {items.map((x, i) => (
          <li key={i} className="flex gap-2 text-sm" dir="auto">
            <span className="mt-0.5">{icon}</span>
            {x}
          </li>
        ))}
      </ul>
    </div>
  );
}
