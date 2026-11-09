import { Link } from "react-router-dom";
import { useMentorLocalizer } from "@/data/mentorText";
import { Accessibility, ArrowRight, Compass, Languages, Layers, ListChecks, Star, TrendingUp } from "lucide-react";
import { MENTORS, MENTOR_BY_ID, mentorStyle } from "@/data/mentors";
import { MentorCharacter } from "@/components/mentors/MentorPortrait";
import { RecentSessions } from "@/components/dashboard/RecentSessions";
import { StatCard } from "@/components/progress/StatCard";
import { AchievementList } from "@/components/progress/Achievements";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { LanguageSwitcher } from "@/components/navigation/LanguageSwitcher";
import { useAuth } from "@/store/authStore";
import { useStudentData } from "@/hooks/useStudentData";
import { useTopicStore } from "@/features/learning/hooks";
import { computeAchievements } from "@/utils/achievements";
import { useT } from "@/i18n/strings";
import type { MentorId } from "@/types";

export function DashboardPage() {
  const profile = useAuth((s) => s.profile);
  const t = useT();
  const L = useMentorLocalizer();
  const setTopic = useTopicStore((s) => s.setTopic);
  const { sessions, exercises, progress, stats, loading, error } = useStudentData();
  const achievements = computeAchievements(stats, progress, sessions);
  const activities = Object.values(stats?.items_by_kind ?? {}).reduce((a, n) => a + (n ?? 0), 0);
  const latest = sessions[0];

  // transparent, rule-based suggestion from stored activity
  const weak = stats?.needs_practice[0];
  const open = exercises.find((e) => e.status === "assigned" && e.session_id);
  const used = new Set<MentorId>([...sessions.map((s) => s.mentor_id), ...(Object.keys(stats?.items_by_mentor ?? {}) as MentorId[])]);
  const unexplored = MENTORS.find((m) => !used.has(m.id));
  const suggestion = weak
    ? {
        mentor: MENTOR_BY_ID[weak.mentor_id],
        text: `${t("progress.practice")}: ${weak.topic}`,
        href: `/learn/${weak.mentor_id}/quiz`,
        topic: weak.topic,
        cta: t("exp.quiz.name"),
      }
    : open
      ? { mentor: MENTOR_BY_ID[open.mentor_id], text: open.question, href: `/learn/${open.mentor_id}/chat?session=${open.session_id}`, cta: t("common.continue") }
      : unexplored
        ? { mentor: unexplored, text: L(unexplored).tagline, href: `/learn/${unexplored.id}`, cta: t("landing.meet", { name: unexplored.name }) }
        : { mentor: MENTOR_BY_ID[MENTORS[0].id], text: t("exp.game.desc"), href: `/learn/${MENTORS[0].id}/game`, cta: t("exp.game.name") };

  const v = (n: number | string) => (loading ? "…" : n);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end gap-4">
        <h1 className="font-display text-4xl sm:text-5xl" data-testid="welcome-name">
          {t("dash.welcome", { name: profile?.display_name ?? "" })}
        </h1>
        {latest && (
          <Button asChild variant="outline" className="ms-auto">
            <Link to={`/learn/${latest.mentor_id}/chat?session=${latest.id}`}>
              {t("dash.continue")} <ArrowRight className="rtl:-scale-x-100" />
            </Link>
          </Button>
        )}
      </header>
      {error && (
        <p role="alert" className="mt-4 text-sm text-terracotta-deep">
          {error}
        </p>
      )}

      {/* mentors — the characters are the way in */}
      <section className="mt-8" aria-labelledby="mentors-title">
        <h2 id="mentors-title" className="sr-only">
          {t("dash.mentors")}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {MENTORS.map((m) => (
            <li key={m.id}>
              <Link
                to={`/learn/${m.id}`}
                style={mentorStyle(m)}
                className="group flex items-end gap-3 rounded-3xl border border-ink/10 bg-paper p-4 transition-colors hover:border-[var(--mentor)] hover:bg-[var(--mentor-soft)]"
                data-testid={`dash-mentor-${m.id}`}
              >
                <div className="w-24 shrink-0">
                  <MentorCharacter mentor={m} decorative />
                </div>
                <div className="pb-2">
                  <p className="font-display text-2xl leading-tight">{m.name}</p>
                  <p className="text-sm text-slate-deep">{L(m).shortDomain}</p>
                  <p className="mt-1 text-xs text-slate-deep">
                    {t("progress.activities")}: {stats?.items_by_mentor[m.id] ?? 0}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden p-0 lg:col-span-2" style={mentorStyle(suggestion.mentor)} data-testid="suggested-next">
          <div className="flex items-stretch">
            <div className="flex-1 p-6">
              <p className="flex items-center gap-2 text-sm font-semibold text-[var(--mentor-deep)]">
                <Compass className="size-4" aria-hidden="true" /> {t("dash.suggested")}
              </p>
              <p className="mt-3 font-display text-2xl" dir="auto">
                {suggestion.text}
              </p>
              <Button asChild variant="mentor" className="mt-5">
                <Link to={suggestion.href} onClick={() => suggestion.topic && setTopic(suggestion.mentor.id, suggestion.topic)}>
                  {suggestion.cta} <ArrowRight className="rtl:-scale-x-100" />
                </Link>
              </Button>
            </div>
            <div className="hidden w-40 self-end bg-[var(--mentor-soft)] px-3 pt-3 sm:block">
              <MentorCharacter mentor={suggestion.mentor} state="talking" frame={false} decorative />
            </div>
          </div>
        </Card>

        <Card className="p-6" data-focus-hide>
          <h2 className="font-display text-2xl">{t("dash.quickSettings")}</h2>
          <div className="mt-4 space-y-3">
            <LanguageSwitcher />
            <Link to="/settings" className="flex items-center gap-2 rounded-xl p-2 text-sm font-medium hover:bg-ink/5">
              <Accessibility className="size-4 text-teal-deep" aria-hidden="true" /> {t("set.reading")} · {t("set.focusTitle")}
            </Link>
            <Link to="/settings" className="flex items-center gap-2 rounded-xl p-2 text-sm font-medium hover:bg-ink/5">
              <Languages className="size-4 text-teal-deep" aria-hidden="true" /> {t("set.replyLanguage")}
            </Link>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ListChecks} label={t("progress.activities")} value={v(activities)} />
        <StatCard icon={Star} label={t("progress.points")} value={v(stats?.points ?? 0)} />
        <StatCard icon={Layers} label={t("chat.sessions")} value={v(sessions.length)} />
        <StatCard icon={TrendingUp} label={t("progress.days")} value={v(stats?.active_days ?? 0)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2" data-focus-hide>
        <Card className="p-6">
          <div className="flex items-center">
            <h2 className="font-display text-2xl">{t("dash.achievements")}</h2>
            <Link to="/progress" className="ms-auto text-sm font-medium text-teal-deep hover:underline">
              {t("nav.progress")}
            </Link>
          </div>
          <div className="mt-3">
            <AchievementList items={achievements} compact />
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="font-display text-2xl">{t("chat.sessions")}</h2>
          <div className="mt-3">
            {loading ? <p className="text-sm text-slate-deep">{t("common.loading")}</p> : <RecentSessions sessions={sessions} />}
          </div>
        </Card>
      </div>
    </div>
  );
}
