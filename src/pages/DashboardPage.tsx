import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpenCheck,
  Compass,
  GraduationCap,
  Layers,
  MessageCircleQuestion,
} from "lucide-react";
import { MENTORS, MENTOR_BY_ID, mentorStyle } from "@/data/mentors";
import { MentorAvatar, MentorPortrait } from "@/components/mentors/MentorPortrait";
import { RecentSessions } from "@/components/dashboard/RecentSessions";
import { StatCard } from "@/components/progress/StatCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { useAuth } from "@/store/authStore";
import { useStudentData } from "@/hooks/useStudentData";
import { suggestNext, summarise } from "@/utils/progress";
import { useT } from "@/i18n/strings";

export function DashboardPage() {
  const profile = useAuth((s) => s.profile);
  const t = useT();
  const { sessions, exercises, progress, loading, error } = useStudentData();
  const p = summarise(progress, sessions, exercises);
  const next = suggestNext(p.perMentor, exercises);
  const nextMentor = MENTOR_BY_ID[next.mentorId];
  const latest = sessions[0];
  const v = (n: number | string) => (loading ? "…" : n);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-gold-deep">
            {t("dash.welcome")}
          </p>
          <h1 className="font-display text-4xl" data-testid="welcome-name">
            {profile?.display_name ?? "Student"}
          </h1>
        </div>
        {latest && (
          <Button asChild variant="outline" className="ms-auto">
            <Link to={`/learn/${latest.mentor_id}?session=${latest.id}`}>
              Continue “{latest.title}” <ArrowRight className="rtl:-scale-x-100" />
            </Link>
          </Button>
        )}
      </header>

      {error && (
        <p role="alert" className="mt-4 text-sm text-terracotta-deep">
          {error}
        </p>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card
          className="relative overflow-hidden p-0 lg:col-span-2"
          style={mentorStyle(nextMentor)}
          data-testid="suggested-next"
        >
          <div className="flex h-full flex-col gap-6 sm:flex-row">
            <div className="flex-1 p-6">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--mentor-deep)]">
                <Compass className="size-4" aria-hidden="true" /> Suggested next
              </p>
              <h2 className="mt-3 font-display text-3xl">{next.title}</h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-ink/75" dir="auto">
                {next.detail}
              </p>
              <Button asChild variant="mentor" className="mt-5">
                <Link to={next.href}>
                  Let's go <ArrowRight className="rtl:-scale-x-100" />
                </Link>
              </Button>
              <p className="mt-3 text-[11px] text-slate-deep">
                Suggested from your recorded activity.
              </p>
            </div>
            <div className="hidden w-48 self-end bg-[var(--mentor-soft)] px-4 pt-4 sm:block">
              <MentorPortrait mentor={nextMentor} showMedallion={false} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-2xl">Your mentors</h2>
          <ul className="mt-4 space-y-2">
            {MENTORS.map((m) => (
              <li key={m.id}>
                <Link
                  to={`/learn/${m.id}`}
                  className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-ink/5"
                  data-testid={`dash-mentor-${m.id}`}
                >
                  <MentorAvatar mentor={m} size={44} />
                  <div className="min-w-0">
                    <p className="font-medium">{m.name}</p>
                    <p className="truncate text-xs text-slate-deep">{m.shortDomain}</p>
                  </div>
                  <ArrowRight
                    className="ms-auto size-4 text-slate-deep rtl:-scale-x-100"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Layers} label="Learning sessions" value={v(p.totalSessions)} />
        <StatCard
          icon={MessageCircleQuestion}
          label="Questions asked"
          value={v(p.totalQuestions)}
        />
        <StatCard
          icon={GraduationCap}
          label="Domains explored"
          value={v(`${p.domainsStudied}/3`)}
        />
        <StatCard
          icon={BookOpenCheck}
          label="Exercises completed"
          value={v(p.exercisesCompleted)}
          hint={p.accuracy === null ? undefined : `${p.accuracy}% correct`}
        />
      </div>

      <Card className="mt-6 p-6">
        <div className="flex items-center">
          <h2 className="font-display text-2xl">Recent sessions</h2>
          <Link
            to="/progress"
            className="ms-auto text-sm font-medium text-teal-deep hover:underline"
          >
            See all progress
          </Link>
        </div>
        <div className="mt-3">
          {loading ? (
            <p className="text-sm text-slate-deep">Loading…</p>
          ) : (
            <RecentSessions sessions={sessions} />
          )}
        </div>
      </Card>
    </div>
  );
}
