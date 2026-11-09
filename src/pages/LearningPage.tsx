import { useEffect, useState } from "react";
import { useMentorLocalizer } from "@/data/mentorText";
import { Link, Navigate, useParams } from "react-router-dom";
import { getMentor, MENTORS, mentorStyle, type MentorProfile } from "@/data/mentors";
import { MentorAvatar, MentorCharacter } from "@/components/mentors/MentorPortrait";
import { Badge, Card } from "@/components/ui/primitives";
import { useT, type StringKey } from "@/i18n/strings";
import { data } from "@/services/data";
import { learn } from "@/services/learn";
import {
  EXPERIENCES,
  GROUP_LABEL,
  getExperience,
  KIND_TO_EXPERIENCE,
  type ExperienceGroup,
} from "@/features/learning/experiences";
import { TopicField } from "@/features/learning/TopicField";
import { ChatModule } from "@/features/learning/modules/ChatModule";
import { QuizModule } from "@/features/learning/modules/QuizModule";
import { FlashcardsModule, KeyTermsModule, SummaryModule } from "@/features/learning/modules/ContentModules";
import { MindMapModule } from "@/features/learning/modules/MindMapModule";
import { TeachBackModule } from "@/features/learning/modules/TeachBackModule";
import { GameModule } from "@/features/learning/modules/GameModule";
import { formatRelative } from "@/utils/format";

/** /learn/:mentorId — the mentor's study. */
export function LearningPage() {
  const { mentorId } = useParams();
  const mentor = getMentor(mentorId);
  if (!mentor) return <Navigate to="/mentors" replace />;
  return <LearningSpace key={mentor.id} mentor={mentor} />;
}

/** /learn/:mentorId/:experienceId — one of the nine modules. */
export function ModulePage() {
  const { mentorId, experienceId } = useParams();
  const mentor = getMentor(mentorId);
  const experience = getExperience(experienceId);
  if (!mentor) return <Navigate to="/mentors" replace />;
  if (!experience) return <Navigate to={`/learn/${mentor.id}`} replace />;
  const key = `${mentor.id}-${experience.id}`;
  switch (experience.id) {
    case "chat":
    case "askwhy":
      return <ChatModule key={key} mentor={mentor} experience={experience} />;
    case "quiz":
      return <QuizModule key={key} mentor={mentor} experience={experience} />;
    case "summary":
      return <SummaryModule key={key} mentor={mentor} experience={experience} />;
    case "keyterms":
      return <KeyTermsModule key={key} mentor={mentor} experience={experience} />;
    case "flashcards":
      return <FlashcardsModule key={key} mentor={mentor} experience={experience} />;
    case "mindmap":
      return <MindMapModule key={key} mentor={mentor} experience={experience} />;
    case "teachback":
      return <TeachBackModule key={key} mentor={mentor} experience={experience} />;
    case "game":
      return <GameModule key={key} mentor={mentor} experience={experience} />;
  }
}

interface RecentEntry {
  key: string;
  label: string;
  kind: StringKey;
  href: string;
  at: string;
}

function LearningSpace({ mentor: baseMentor }: { mentor: MentorProfile }) {
  const t = useT();
  const L = useMentorLocalizer();
  const mentor = L(baseMentor);
  const [recent, setRecent] = useState<RecentEntry[] | null>(null);
  const [topicFocused, setTopicFocused] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([learn.items({ mentorId: mentor.id, limit: 8 }), data.sessions()])
      .then(([items, sessions]) => {
        if (cancelled) return;
        const entries: RecentEntry[] = [
          ...items.map((i) => {
            const exp = getExperience(KIND_TO_EXPERIENCE[i.kind])!;
            return { key: i.id, label: i.topic, kind: exp.name, href: `/learn/${mentor.id}/${exp.id}?item=${i.id}`, at: i.created_at };
          }),
          ...sessions
            .filter((s) => s.mentor_id === mentor.id)
            .slice(0, 5)
            .map((s) => ({
              key: s.id,
              label: s.title,
              kind: "exp.chat.name" as StringKey,
              href: `/learn/${mentor.id}/chat?session=${s.id}`,
              at: s.updated_at,
            })),
        ]
          .sort((a, b) => b.at.localeCompare(a.at))
          .slice(0, 8);
        setRecent(entries);
      })
      .catch(() => !cancelled && setRecent([]));
    return () => {
      cancelled = true;
    };
  }, [mentor.id]);

  const groups: ExperienceGroup[] = ["understand", "practise", "prove"];

  return (
    <div style={mentorStyle(mentor)} className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6" data-testid="learning-space">
      <section className="grid items-end gap-6 md:grid-cols-[minmax(220px,300px)_1fr]" aria-labelledby="mentor-name">
        <div className="mx-auto w-56 md:w-full">
          <MentorCharacter mentor={mentor} state={topicFocused ? "listening" : "idle"} />
        </div>
        <div className="pb-2">
          <p className="text-sm font-medium text-[var(--mentor-deep)]">{mentor.domain}</p>
          <h1 id="mentor-name" className="font-display text-5xl leading-none sm:text-6xl">
            {mentor.name}
          </h1>
          <p className="mt-1 font-ar text-2xl text-[var(--mentor-deep)]" lang="ar" dir="rtl">
            {mentor.nameAr}
          </p>
          <p className="mt-4 max-w-2xl text-lg text-ink/85">
            {t("space.welcome", { name: mentor.name })} {mentor.tagline}
          </p>
          <ul className="mt-4 flex flex-wrap gap-1.5" aria-label={t("a11y.personality")}>
            {mentor.personality.map((p) => (
              <li key={p}>
                <Badge tone="mentor">{p}</Badge>
              </li>
            ))}
          </ul>
          <details className="mt-4 max-w-2xl rounded-2xl bg-paper/70 p-4 text-sm" data-focus-hide>
            <summary className="cursor-pointer font-semibold">{t("space.howITeach")}</summary>
            <p className="mt-2 text-ink/80">{mentor.description}</p>
            <ul className="mt-2 grid gap-1 sm:grid-cols-2">
              {mentor.methodology.map((m) => (
                <li key={m} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--mentor)]" /> {m}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-slate-deep">
              {t("space.subjects")}: {mentor.subjects.join(", ")}
            </p>
          </details>
        </div>
      </section>

      <Card className="mt-6 p-5 sm:p-6" onFocusCapture={() => setTopicFocused(true)} onBlurCapture={() => setTopicFocused(false)}>
        <TopicField mentor={mentor} />
      </Card>

      <div className="mt-8 space-y-8">
        {groups.map((g) => (
          <section key={g} aria-labelledby={`group-${g}`}>
            <h2 id={`group-${g}`} className="font-display text-2xl">
              {t(GROUP_LABEL[g])}
            </h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {EXPERIENCES.filter((e) => e.group === g).map((e) => {
                const Icon = e.icon;
                return (
                  <li key={e.id}>
                    <Link
                      to={`/learn/${mentor.id}/${e.id}`}
                      className="group flex h-full items-start gap-3 rounded-2xl border border-ink/10 bg-paper p-4 transition-colors hover:border-[var(--mentor)] hover:bg-[var(--mentor-soft)]"
                      data-testid={`exp-${e.id}`}
                    >
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--mentor-soft)] text-[var(--mentor-deep)] group-hover:bg-paper">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block font-semibold">{t(e.name)}</span>
                        <span className="mt-0.5 block text-sm text-ink/75">{t(e.desc)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_320px]" data-focus-hide>
        <section aria-labelledby="recent-title">
          <h2 id="recent-title" className="font-display text-2xl">
            {t("space.recent", { name: mentor.name })}
          </h2>
          {recent === null ? (
            <p className="mt-3 text-sm text-slate-deep">{t("common.loading")}</p>
          ) : recent.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-ink/20 p-6 text-center text-sm text-slate-deep">
              {t("space.noRecent")}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-paper" data-testid="recent-activities">
              {recent.map((r) => (
                <li key={r.key}>
                  <Link to={r.href} className="flex items-center gap-3 px-4 py-3 hover:bg-ink/5">
                    <Badge tone="mentor">{t(r.kind)}</Badge>
                    <span className="min-w-0 flex-1 truncate" dir="auto">
                      {r.label}
                    </span>
                    <span className="shrink-0 text-xs text-slate-deep">{formatRelative(r.at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="others-title">
          <h2 id="others-title" className="font-display text-2xl">
            {t("space.switch")}
          </h2>
          <ul className="mt-3 space-y-2">
            {MENTORS.filter((m) => m.id !== mentor.id).map((m) => (
              <li key={m.id}>
                <Link
                  to={`/learn/${m.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-paper p-3 hover:bg-ink/5"
                  data-testid={`switch-${m.id}`}
                >
                  <MentorAvatar mentor={m} size={48} />
                  <span>
                    <span className="block font-semibold">{m.name}</span>
                    <span className="block text-sm text-slate-deep">{L(m).shortDomain}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
