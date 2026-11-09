import { useEffect, useState } from "react";
import { useMentorLocalizer } from "@/data/mentorText";
import {
  BookOpenCheck,
  CheckCircle2,
  Layers,
  MessageCircleQuestion,
  RefreshCw,
  UserPlus,
  XCircle,
} from "lucide-react";
import { MENTOR_BY_ID, MENTORS } from "@/data/mentors";
import { MentorAvatar } from "@/components/mentors/MentorPortrait";
import { StatCard } from "@/components/progress/StatCard";
import { Button } from "@/components/ui/button";
import { Alert, Card, ProgressBar } from "@/components/ui/primitives";
import { useAuth } from "@/store/authStore";
import { data } from "@/services/data";
import { formatRelative } from "@/utils/format";
import type { ChildOverview } from "@/types";
import { useT } from "@/i18n/strings";

/**
 * Parent dashboard. Data comes from get_children_overview(): progress, subjects studied
 * (never session titles) and exercise results of children linked to this parent's confirmed email — never chat contents.
 */
export function ParentDashboardPage() {
  const { user, profile } = useAuth();
  const t = useT();
  const [children, setChildren] = useState<ChildOverview[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    data
      .claimGuardianLinks()
      .catch(() => 0)
      .then(() => data.childrenOverview())
      .then((c) => !cancelled && setChildren(c))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-gold-deep">{t("par.eyebrow")}</p>
          <h1 className="font-display text-4xl">{t("par.hello", { name: profile?.display_name ?? "" })}</h1>
        </div>
        <Button variant="outline" className="ms-auto" onClick={() => setReloadKey((k) => k + 1)}>
          <RefreshCw /> {t("par.refresh")}
        </Button>
      </header>

      {error && (
        <Alert tone="terracotta" className="mt-4">
          <span role="alert">{error}</span>
        </Alert>
      )}

      {children === null && !error && (
        <p className="mt-8 text-sm text-slate-deep">{t("par.loading")}</p>
      )}

      {children?.length === 0 && (
        <Card className="mt-8 p-8 text-center" data-testid="no-children">
          <UserPlus className="mx-auto size-8 text-gold-deep" aria-hidden="true" />
          <h2 className="mt-3 font-display text-2xl">{t("par.noChild")}</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-ink/75">
            {t("par.noChildBody", { email: user?.email ?? "" })}
          </p>
        </Card>
      )}

      {children?.map((c) => (
        <ChildCard key={c.student_id} child={c} />
      ))}

      <p className="mt-8 text-xs text-slate-deep">
        {t("par.privacy")}
      </p>
    </div>
  );
}

function ChildCard({ child }: { child: ChildOverview }) {
  const t = useT();
  const L = useMentorLocalizer();
  const total = child.progress.reduce(
    (a, p) => ({
      sessions: a.sessions + p.sessions,
      questions: a.questions + p.questions,
      done: a.done + p.exercises_completed,
      correct: a.correct + p.exercises_correct,
    }),
    { sessions: 0, questions: 0, done: 0, correct: 0 },
  );
  const lastActivity = child.progress
    .map((p) => p.last_activity_at)
    .sort()
    .at(-1);

  return (
    <section
      className="mt-8"
      data-testid="child-card"
      aria-label={t("par.progressOf", { name: child.display_name })}
    >
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="font-display text-3xl">{child.display_name}</h2>
        <span className="text-sm text-slate-deep">
          {t("par.age", { age: t(`age.${child.age_band}`) })} ·{" "}
          {lastActivity ? t("par.lastActive", { when: formatRelative(lastActivity) }) : t("par.noActivity")}
        </span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Layers} label={t("par.sessions")} value={total.sessions} />
        <StatCard icon={MessageCircleQuestion} label={t("par.questions")} value={total.questions} />
        <StatCard icon={BookOpenCheck} label={t("par.exercises")} value={total.done} />
        <StatCard
          icon={CheckCircle2}
          label={t("par.accuracy")}
          value={total.done ? `${Math.round((total.correct / total.done) * 100)}%` : "–"}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h3 className="font-display text-xl">{t("par.byMentor")}</h3>
          <ul className="mt-3 space-y-4">
            {MENTORS.map((m) => {
              const rows = child.progress.filter((p) => p.mentor_id === m.id);
              const done = rows.reduce((a, r) => a + r.exercises_completed, 0);
              const correct = rows.reduce((a, r) => a + r.exercises_correct, 0);
              const sessions = rows.reduce((a, r) => a + r.sessions, 0);
              return (
                <li key={m.id} className="flex items-center gap-3">
                  <MentorAvatar mentor={m} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{L(m).shortDomain}</p>
                    <p className="text-xs text-slate-deep">
                      {t("par.mentorLine", { sessions, correct, done })}
                    </p>
                    <ProgressBar
                      className="mt-1"
                      value={done ? (correct / done) * 100 : 0}
                      color={m.color.base}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="p-5">
          <h3 className="font-display text-xl">{t("par.recentSessions")}</h3>
          {child.recent_sessions.length === 0 ? (
            <p className="mt-3 text-sm text-slate-deep">{t("par.noSessions")}</p>
          ) : (
            <ul className="mt-3 divide-y divide-ink/10">
              {child.recent_sessions.map((s, i) => (
                <li key={i} className="flex items-center gap-2 py-2">
                  <MentorAvatar mentor={MENTOR_BY_ID[s.mentor_id]} size={26} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{s.subject}</p>
                    <p className="text-xs text-slate-deep">
                      {t("par.questionsN", { n: s.questions })} ·{" "}
                      {formatRelative(s.updated_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-display text-xl">{t("par.recentExercises")}</h3>
          {child.recent_exercises.length === 0 ? (
            <p className="mt-3 text-sm text-slate-deep">{t("par.noExercises")}</p>
          ) : (
            <ul className="mt-3 divide-y divide-ink/10">
              {child.recent_exercises.map((e, i) => (
                <li key={i} className="flex items-start gap-2 py-2">
                  {e.is_correct ? (
                    <CheckCircle2
                      className="mt-0.5 size-4 shrink-0 text-teal-deep"
                      aria-label={t("par.correct")}
                    />
                  ) : (
                    <XCircle
                      className="mt-0.5 size-4 shrink-0 text-terracotta-deep"
                      aria-label={t("par.incorrect")}
                    />
                  )}
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm" dir="auto">
                      {e.question}
                    </p>
                    <p className="text-xs text-slate-deep">
                      {MENTOR_BY_ID[e.mentor_id].name} · {t("par.attemptsN", { n: e.attempts })} ·{" "}
                      {formatRelative(e.completed_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </section>
  );
}
