import { useEffect, useState } from "react";
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

const AGE_LABEL = {
  under_13: "Under 13",
  "13_15": "13–15",
  "16_17": "16–17",
  "18_plus": "18+",
} as const;

/**
 * Parent dashboard. Data comes from get_children_overview(): progress, session titles and
 * exercise results of children linked to this parent's confirmed email — never chat contents.
 */
export function ParentDashboardPage() {
  const { user, profile } = useAuth();
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
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-gold-deep">
            Parent dashboard
          </p>
          <h1 className="font-display text-4xl">Hello, {profile?.display_name}</h1>
        </div>
        <Button variant="outline" className="ms-auto" onClick={() => setReloadKey((k) => k + 1)}>
          <RefreshCw /> Refresh
        </Button>
      </header>

      {error && (
        <Alert tone="terracotta" className="mt-4">
          <span role="alert">{error}</span>
        </Alert>
      )}

      {children === null && !error && (
        <p className="mt-8 text-sm text-slate-deep">Loading your children's progress…</p>
      )}

      {children?.length === 0 && (
        <Card className="mt-8 p-8 text-center" data-testid="no-children">
          <UserPlus className="mx-auto size-8 text-gold-deep" aria-hidden="true" />
          <h2 className="mt-3 font-display text-2xl">No child linked yet</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-ink/75">
            Ask your child to enter <strong>{user?.email}</strong> as their parent's email when they
            create their student account, or to add it from their account page. Their progress
            appears here automatically once they do.
          </p>
        </Card>
      )}

      {children?.map((c) => (
        <ChildCard key={c.student_id} child={c} />
      ))}

      <p className="mt-8 text-xs text-slate-deep">
        For your child's privacy, you can see their progress, which subjects they studied and their
        exercise results, but not what they wrote to the mentors.
      </p>
    </div>
  );
}

function ChildCard({ child }: { child: ChildOverview }) {
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
      aria-label={`Progress of ${child.display_name}`}
    >
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="font-display text-3xl">{child.display_name}</h2>
        <span className="text-sm text-slate-deep">
          Age {AGE_LABEL[child.age_band]} ·{" "}
          {lastActivity ? `last active ${formatRelative(lastActivity)}` : "no activity yet"}
        </span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Layers} label="Sessions" value={total.sessions} />
        <StatCard icon={MessageCircleQuestion} label="Questions asked" value={total.questions} />
        <StatCard icon={BookOpenCheck} label="Exercises completed" value={total.done} />
        <StatCard
          icon={CheckCircle2}
          label="Accuracy"
          value={total.done ? `${Math.round((total.correct / total.done) * 100)}%` : "–"}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h3 className="font-display text-xl">By mentor</h3>
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
                    <p className="text-sm font-medium">{m.shortDomain}</p>
                    <p className="text-xs text-slate-deep">
                      {sessions} sessions · {correct}/{done} exercises correct
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
          <h3 className="font-display text-xl">Recent sessions</h3>
          {child.recent_sessions.length === 0 ? (
            <p className="mt-3 text-sm text-slate-deep">No sessions yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-ink/10">
              {child.recent_sessions.map((s, i) => (
                <li key={i} className="flex items-center gap-2 py-2">
                  <MentorAvatar mentor={MENTOR_BY_ID[s.mentor_id]} size={26} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{s.subject}</p>
                    <p className="text-xs text-slate-deep">
                      {s.questions} question{s.questions === 1 ? "" : "s"} ·{" "}
                      {formatRelative(s.updated_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-display text-xl">Recent exercises</h3>
          {child.recent_exercises.length === 0 ? (
            <p className="mt-3 text-sm text-slate-deep">No exercises completed yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-ink/10">
              {child.recent_exercises.map((e, i) => (
                <li key={i} className="flex items-start gap-2 py-2">
                  {e.is_correct ? (
                    <CheckCircle2
                      className="mt-0.5 size-4 shrink-0 text-teal-deep"
                      aria-label="Correct"
                    />
                  ) : (
                    <XCircle
                      className="mt-0.5 size-4 shrink-0 text-terracotta-deep"
                      aria-label="Not correct"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm" dir="auto">
                      {e.question}
                    </p>
                    <p className="text-xs text-slate-deep">
                      {MENTOR_BY_ID[e.mentor_id].firstName} · {e.attempts} attempt
                      {e.attempts === 1 ? "" : "s"} · {formatRelative(e.completed_at)}
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
