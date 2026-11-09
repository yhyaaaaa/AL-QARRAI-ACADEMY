import { useEffect, useState } from "react";
import { BookmarkCheck, ChevronLeft, ChevronRight, Repeat2, RotateCcw, Volume2 } from "lucide-react";
import type { MentorProfile } from "@/data/mentors";
import { Button } from "@/components/ui/button";
import { Badge, Card, ProgressBar } from "@/components/ui/primitives";
import { MarkdownContent } from "@/components/chat/MarkdownContent";
import { useErrorMessage, useT } from "@/i18n/strings";
import { learn } from "@/services/learn";
import type { FlashcardsContent, KeyTermsContent, LearningItem, SummaryContent } from "@/types/learning";
import { ActivityFrame } from "../ActivityFrame";
import type { Experience } from "../experiences";
import { useCharacterState, useSpeech } from "../hooks";
import { useActivity } from "../useActivity";
import { frameProps } from "../frameProps";
import { ErrorState, ModuleShell, ReadAloudButton, Segmented } from "../ui";
import { cn } from "@/lib/utils";

// ───────────────────────────── Smart Summary ─────────────────────────────
export function SummaryModule({ mentor, experience }: { mentor: MentorProfile; experience: Experience }) {
  const t = useT();
  const act = useActivity(mentor.id, "summary");
  const [length, setLength] = useState<"short" | "standard" | "detailed">("standard");
  const character = useCharacterState({ pending: act.pending, typing: false });
  const { answered } = character;
  useEffect(() => {
    if (act.item) answered();
  }, [act.item, answered]);

  return (
    <ModuleShell mentor={mentor} experience={experience} state={character.state} topic={act.item?.topic}>
      <ActivityFrame
        {...frameProps(act)}
        mentor={mentor}
        experience={experience}
        onGenerate={(topic) => void act.generate(topic, { length })}
        options={
          <Segmented
            label={t("summary.length")}
            value={length}
            onChange={setLength}
            options={[
              { value: "short", label: t("summary.short") },
              { value: "standard", label: t("summary.standard") },
              { value: "detailed", label: t("summary.detailed") },
            ]}
          />
        }
      >
        {(item) => <SummaryView item={item as LearningItem<"summary">} />}
      </ActivityFrame>
    </ModuleShell>
  );
}

function SummaryView({ item }: { item: LearningItem<"summary"> }) {
  const t = useT();
  const c = item.content as SummaryContent;
  const all = [c.title, c.overview, ...c.mainIdeas, ...c.takeaways].join(". ");
  return (
    <article className="space-y-5" data-testid="summary-view">
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="font-display text-3xl" dir="auto">
            {c.title}
          </h2>
          <ReadAloudButton id={`sum-${item.id}`} text={all} />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-[var(--mentor-deep)]">{t("summary.overview")}</h3>
        <MarkdownContent className="mt-1 max-w-prose text-base">{c.overview}</MarkdownContent>
      </Card>
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="font-display text-xl">{t("summary.mainIdeas")}</h3>
          <ol className="mt-3 list-decimal space-y-2 ps-5">
            {c.mainIdeas.map((m, i) => (
              <li key={i}>
                <MarkdownContent>{m}</MarkdownContent>
              </li>
            ))}
          </ol>
        </Card>
        <Card className="border-[var(--mentor)] bg-[var(--mentor-soft)] p-6">
          <h3 className="font-display text-xl">{t("summary.takeaways")}</h3>
          <ul className="mt-3 space-y-2">
            {c.takeaways.map((m, i) => (
              <li key={i} className="flex gap-2">
                <BookmarkCheck className="mt-1 size-4 shrink-0 text-[var(--mentor-deep)]" aria-hidden="true" />
                <MarkdownContent>{m}</MarkdownContent>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      {c.concepts.length > 0 && (
        <Card className="p-6">
          <h3 className="font-display text-xl">{t("summary.concepts")}</h3>
          <dl className="mt-3 grid gap-4 sm:grid-cols-2">
            {c.concepts.map((x, i) => (
              <div key={i}>
                <dt className="font-semibold" dir="auto">
                  {x.name}
                </dt>
                <dd className="mt-0.5 text-ink/80">
                  <MarkdownContent>{x.explanation}</MarkdownContent>
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      )}
      {c.definitions.length > 0 && (
        <Card className="p-6">
          <h3 className="font-display text-xl">{t("summary.definitions")}</h3>
          <dl className="mt-3 divide-y divide-ink/10">
            {c.definitions.map((d, i) => (
              <div key={i} className="grid gap-1 py-2 sm:grid-cols-[180px_1fr]">
                <dt className="font-semibold" dir="auto">
                  {d.term}
                </dt>
                <dd>
                  <MarkdownContent>{d.definition}</MarkdownContent>
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      )}
    </article>
  );
}

// ───────────────────────────── Key Terms ─────────────────────────────
export function KeyTermsModule({ mentor, experience }: { mentor: MentorProfile; experience: Experience }) {
  const act = useActivity(mentor.id, "keyterms");
  const character = useCharacterState({ pending: act.pending, typing: false });
  const { answered } = character;
  useEffect(() => {
    if (act.item) answered();
  }, [act.item, answered]);
  return (
    <ModuleShell mentor={mentor} experience={experience} state={character.state} topic={act.item?.topic}>
      <ActivityFrame
        {...frameProps(act)}
        mentor={mentor}
        experience={experience}
        onGenerate={(topic) => void act.generate(topic, { count: 8 })}
      >
        {(item) => <KeyTermsView item={item as LearningItem<"keyterms">} />}
      </ActivityFrame>
    </ModuleShell>
  );
}

function KeyTermsView({ item }: { item: LearningItem<"keyterms"> }) {
  const t = useT();
  const { supported, speak } = useSpeech();
  const c = item.content as KeyTermsContent;
  return (
    <ul className="grid gap-4 md:grid-cols-2" data-testid="keyterms-view">
      {c.terms.map((term, i) => (
        <li key={i}>
          <Card className="h-full p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-2xl" dir="auto">
                  {term.term}
                </h2>
                {term.pronunciation && (
                  <p className="text-sm text-slate-deep" dir="auto">
                    /{term.pronunciation}/
                  </p>
                )}
              </div>
              {supported && (
                <button
                  type="button"
                  onClick={() => speak(`term-${item.id}-${i}`, term.term)}
                  className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full px-3 text-xs font-medium text-[var(--mentor-deep)] hover:bg-ink/5"
                  aria-label={`${t("terms.say")}: ${term.term}`}
                >
                  <Volume2 className="size-4" aria-hidden="true" /> {t("terms.say")}
                </button>
              )}
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="font-semibold text-[var(--mentor-deep)]">{t("terms.definition")}</dt>
                <dd>
                  <MarkdownContent className="text-sm">{term.definition}</MarkdownContent>
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--mentor-deep)]">{t("terms.example")}</dt>
                <dd className="italic">
                  <MarkdownContent className="text-sm">{term.example}</MarkdownContent>
                </dd>
              </div>
              {term.related.length > 0 && (
                <div>
                  <dt className="font-semibold text-[var(--mentor-deep)]">{t("terms.related")}</dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    {term.related.map((r) => (
                      <Badge key={r} tone="mentor">
                        <span dir="auto">{r}</span>
                      </Badge>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </Card>
        </li>
      ))}
    </ul>
  );
}

// ───────────────────────────── Flashcards ─────────────────────────────
export function FlashcardsModule({ mentor, experience }: { mentor: MentorProfile; experience: Experience }) {
  const act = useActivity(mentor.id, "flashcards");
  const character = useCharacterState({ pending: act.pending, typing: false });
  return (
    <ModuleShell mentor={mentor} experience={experience} state={character.state} topic={act.item?.topic}>
      <ActivityFrame
        {...frameProps(act)}
        mentor={mentor}
        experience={experience}
        onGenerate={(topic) => void act.generate(topic, { count: 8 })}
      >
        {(item) => <FlashcardDeck key={item.id} item={item as LearningItem<"flashcards">} onFlip={character.answered} />}
      </ActivityFrame>
    </ModuleShell>
  );
}

function FlashcardDeck({ item, onFlip }: { item: LearningItem<"flashcards">; onFlip: () => void }) {
  const t = useT();
  const errorMessage = useErrorMessage();
  const cards = (item.content as FlashcardsContent).cards;
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviews, setReviews] = useState<Record<number, "known" | "practice">>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    learn.flashcardReviews(item.id).then(setReviews).catch(() => undefined);
  }, [item.id]);

  const card = cards[index];
  const known = Object.values(reviews).filter((s) => s === "known").length;
  const practice = Object.values(reviews).filter((s) => s === "practice").length;

  const go = (d: number) => {
    setFlipped(false);
    setIndex((i) => (i + d + cards.length) % cards.length);
  };

  async function mark(status: "known" | "practice") {
    setError(null);
    const prev = reviews;
    setReviews((r) => ({ ...r, [index]: status }));
    try {
      await learn.reviewFlashcard(item.id, index, status);
      if (index + 1 < cards.length) go(1);
    } catch (e) {
      setReviews(prev);
      setError(errorMessage(e));
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4" data-testid="flashcards-view">
      <div className="flex items-center justify-between text-sm text-slate-deep">
        <span aria-live="polite">{t("cards.card", { n: index + 1, total: cards.length })}</span>
        <span>{t("cards.progress", { known, practice })}</span>
      </div>
      <ProgressBar value={((known + practice) / cards.length) * 100} color="var(--mentor)" />

      <div className="flip-card" data-flipped={flipped}>
        <button
          type="button"
          onClick={() => {
            setFlipped((f) => !f);
            onFlip();
          }}
          className="block min-h-64 w-full cursor-pointer text-center"
          aria-label={flipped ? t("cards.showQuestion") : t("cards.showAnswer")}
          data-testid="flashcard"
        >
          <span className="flip-card-inner relative grid min-h-64">
            <span
              className="flip-face col-start-1 row-start-1 flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-[var(--mentor)] bg-paper p-8 shadow-[var(--shadow-card)]"
              aria-hidden={flipped}
            >
              <span className="text-xs font-medium text-[var(--mentor-deep)]">?</span>
              <span className="font-display text-2xl" dir="auto">
                {card.front}
              </span>
              {card.hint && <span className="text-sm text-slate-deep">{card.hint}</span>}
            </span>
            <span
              className="flip-face flip-face-back col-start-1 row-start-1 flex items-center justify-center rounded-3xl border-2 border-[var(--mentor-deep)] bg-[var(--mentor-soft)] p-8 shadow-[var(--shadow-card)]"
              aria-hidden={!flipped}
            >
              <span className="text-lg" dir="auto">
                <MarkdownContent>{card.back}</MarkdownContent>
              </span>
            </span>
          </span>
        </button>
      </div>
      {reviews[index] && (
        <p className="text-center text-sm text-slate-deep">
          <Badge tone={reviews[index] === "known" ? "teal" : "gold"}>
            {reviews[index] === "known" ? t("cards.known") : t("cards.practice")}
          </Badge>
        </p>
      )}

      {error && <ErrorState message={error} />}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="outline" onClick={() => go(-1)} aria-label={t("common.previous")}>
          <ChevronLeft className="rtl:-scale-x-100" /> {t("common.previous")}
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => void mark("practice")}
            className={cn(reviews[index] === "practice" && "ring-2 ring-gold")}
            data-testid="card-practice"
          >
            <Repeat2 /> {t("cards.practice")}
          </Button>
          <Button variant="mentor" onClick={() => void mark("known")} data-testid="card-known">
            <BookmarkCheck /> {t("cards.known")}
          </Button>
        </div>
        <Button variant="outline" onClick={() => go(1)} aria-label={t("common.next")}>
          {t("common.next")} <ChevronRight className="rtl:-scale-x-100" />
        </Button>
      </div>
      <div className="text-center">
        <Button variant="ghost" size="sm" onClick={() => setFlipped((f) => !f)}>
          <RotateCcw /> {t("cards.flip")}
        </Button>
      </div>
    </div>
  );
}
