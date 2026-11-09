import { Link } from "react-router-dom";
import {
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Layers,
  Target,
  XCircle,
} from "lucide-react";
import { MENTOR_BY_ID } from "@/data/mentors";
import { MentorAvatar } from "@/components/mentors/MentorPortrait";
import { StatCard } from "@/components/progress/StatCard";
import { RecentSessions } from "@/components/dashboard/RecentSessions";
import { Card, ProgressBar } from "@/components/ui/primitives";
import { useStudentData } from "@/hooks/useStudentData";
import { summarise } from "@/utils/progress";
import { formatRelative } from "@/utils/format";

export function ProgressPage() {
  const { sessions, exercises, progress, loading, error } = useStudentData();
  const p = summarise(progress, sessions, exercises);
  const maxActivity = Math.max(1, ...p.activity.map((a) => a.count));
  const completed = exercises.filter((e) => e.status === "completed");
  const v = (n: number | string) => (loading ? "…" : n);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <header>
        <h1 className="font-display text-4xl">Your progress</h1>
        <p className="mt-1 text-sm text-slate-deep">
          Calculated from your saved sessions, questions and graded exercises.
        </p>
      </header>
      {error && (
        <p role="alert" className="mt-4 text-sm text-terracotta-deep">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Layers} label="Sessions" value={v(p.totalSessions)} />
        <StatCard icon={GraduationCap} label="Domains studied" value={v(`${p.domainsStudied}/3`)} />
        <StatCard
          icon={BookOpenCheck}
          label="Exercises completed"
          value={v(p.exercisesCompleted)}
          hint={p.exercisesOpen ? `${p.exercisesOpen} still open` : undefined}
        />
        <StatCard
          icon={Target}
          label="Accuracy"
          value={p.accuracy === null ? "–" : `${p.accuracy}%`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h2 className="font-display text-2xl">By mentor</h2>
          <ul className="mt-5 space-y-5">
            {p.perMentor.map((mp) => {
              const m = MENTOR_BY_ID[mp.mentorId];
              const acc = mp.exercisesCompleted
                ? (mp.exercisesCorrect / mp.exercisesCompleted) * 100
                : 0;
              return (
                <li key={m.id} className="flex items-center gap-4" data-testid={`progress-${m.id}`}>
                  <MentorAvatar mentor={m} size={46} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <p className="font-medium">{m.shortDomain}</p>
                      <p className="text-xs text-slate-deep">
                        {mp.sessions} session{mp.sessions === 1 ? "" : "s"} · {mp.questions}{" "}
                        question{mp.questions === 1 ? "" : "s"} · {mp.exercisesCorrect}/
                        {mp.exercisesCompleted} exercises correct
                        {mp.lastActivity ? ` · last ${formatRelative(mp.lastActivity)}` : ""}
                      </p>
                    </div>
                    <ProgressBar className="mt-2" value={acc} color={m.color.base} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="p-6">
          <h2 className="flex items-center gap-2 font-display text-2xl">
            <CalendarDays className="size-5 text-gold-deep" aria-hidden="true" /> Last 7 days
          </h2>
          <div
            className="mt-6 flex h-36 items-end gap-2"
            role="img"
            aria-label="Activity over the last 7 days"
          >
            {p.activity.map((a) => (
              <div
                key={a.date.toISOString()}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
              >
                <span className="text-[11px] text-slate-deep">{a.count || ""}</span>
                <div
                  className="w-full max-h-[calc(100%-2.5rem)] rounded-t-md bg-teal"
                  style={{
                    height: `${(a.count / maxActivity) * 100}%`,
                    minHeight: 3,
                    opacity: a.count ? 1 : 0.25,
                  }}
                />
                <span className="text-[11px] text-slate-deep">
                  {a.date.toLocaleDateString(undefined, { weekday: "narrow" })}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display text-2xl">Learning history</h2>
          <div className="mt-3">
            <RecentSessions sessions={sessions} limit={30} />
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="font-display text-2xl">Completed exercises</h2>
          {completed.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-ink/20 p-6 text-center text-sm text-slate-deep">
              No exercises completed yet.{" "}
              <Link to="/mentors" className="text-teal-deep hover:underline">
                Ask a mentor for one.
              </Link>
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-ink/10">
              {completed.slice(0, 20).map((e) => (
                <li key={e.id} className="flex items-start gap-3 py-3">
                  {e.is_correct ? (
                    <CheckCircle2
                      className="mt-0.5 size-5 shrink-0 text-teal-deep"
                      aria-label="Correct"
                    />
                  ) : (
                    <XCircle
                      className="mt-0.5 size-5 shrink-0 text-terracotta-deep"
                      aria-label="Incorrect"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm" dir="auto">
                      {e.question}
                    </p>
                    <p className="text-xs text-slate-deep">
                      {MENTOR_BY_ID[e.mentor_id].firstName} · {e.attempts} attempt
                      {e.attempts === 1 ? "" : "s"} ·{" "}
                      {formatRelative(e.completed_at ?? e.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
