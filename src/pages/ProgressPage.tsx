import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { GraduationCap, ListChecks, Star, Target, TrendingUp } from "lucide-react";
import { MENTORS, MENTOR_BY_ID } from "@/data/mentors";
import { MentorAvatar } from "@/components/mentors/MentorPortrait";
import { StatCard } from "@/components/progress/StatCard";
import { AchievementList } from "@/components/progress/Achievements";
import { Badge, Card, ProgressBar } from "@/components/ui/primitives";
import { useStudentData } from "@/hooks/useStudentData";
import { useTopicStore } from "@/features/learning/hooks";
import { computeAchievements } from "@/utils/achievements";
import { formatRelative } from "@/utils/format";
import { useT, type StringKey } from "@/i18n/strings";

const TEACH_LEVEL: StringKey[] = ["teach.level0", "teach.level1", "teach.level2", "teach.level3"];

export function ProgressPage() {
  const t = useT();
  const setTopic = useTopicStore((s) => s.setTopic);
  const { sessions, progress, stats, loading, error } = useStudentData();
  const achievements = computeAchievements(stats, progress, sessions);
  const activities = Object.values(stats?.items_by_kind ?? {}).reduce((a, n) => a + (n ?? 0), 0);
  const quizzes = (stats?.quizzes ?? []).filter((q) => q.answered > 0);
  const quizAvg = quizzes.length ? Math.round((quizzes.reduce((a, q) => a + q.correct / q.total, 0) / quizzes.length) * 100) : null;
  const v = (n: number | string) => (loading ? "…" : n);
  const chartData = quizzes
    .slice(0, 8)
    .reverse()
    .map((q) => ({ name: q.topic.slice(0, 14), score: Math.round((q.correct / q.total) * 100), fill: MENTOR_BY_ID[q.mentor_id].color.deep }));

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-4xl">{t("progress.title")}</h1>
      <p className="mt-1 text-slate-deep">{t("progress.intro")}</p>
      {error && (
        <p role="alert" className="mt-4 text-sm text-terracotta-deep">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ListChecks} label={t("progress.activities")} value={v(activities)} />
        <StatCard icon={Target} label={t("progress.quizzes")} value={quizAvg === null ? "–" : `${quizAvg}%`} />
        <StatCard icon={Star} label={t("progress.points")} value={v(stats?.points ?? 0)} />
        <StatCard icon={TrendingUp} label={t("progress.days")} value={v(stats?.active_days ?? 0)} />
      </div>

      <Card className="mt-6 p-6">
        <h2 className="font-display text-2xl">{t("dash.achievements")}</h2>
        <div className="mt-3">
          <AchievementList items={achievements} />
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display text-2xl">{t("progress.byMentor")}</h2>
          <ul className="mt-4 space-y-4">
            {MENTORS.map((m) => {
              const rows = progress.filter((p) => p.subjects?.mentor_id === m.id);
              const questions = rows.reduce((a, r) => a + r.messages_count, 0);
              const items = stats?.items_by_mentor[m.id] ?? 0;
              const level = stats?.game_levels_by_mentor[m.id];
              return (
                <li key={m.id} className="flex items-center gap-3" data-testid={`progress-${m.id}`}>
                  <MentorAvatar mentor={m} size={46} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{m.name}</p>
                    <p className="text-xs text-slate-deep">
                      {t("progress.activities")}: {items} · {t("exp.chat.name")}: {questions}
                      {level ? ` · ${t("exp.game.name")}: ${t("common.level", { n: level })}` : ""}
                    </p>
                    <ProgressBar className="mt-1.5" value={Math.min(100, (items + questions) * 5)} color={m.color.base} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-2xl">{t("progress.quizzes")}</h2>
          {quizzes.length === 0 ? (
            <p className="mt-3 text-sm text-slate-deep">{t("progress.noData")}</p>
          ) : (
            <>
              <div className="mt-4 h-48" aria-hidden="true" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EADCC6" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#4A5B6E" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#4A5B6E" }} unit="%" />
                    <Tooltip cursor={{ fill: "rgb(20 35 55 / 0.05)" }} />
                    <Bar dataKey="score" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                      {chartData.map((d, i) => (
                        <Cell key={i} fill={d.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* text equivalent of the chart */}
              <table className="mt-3 w-full text-sm">
                <caption className="sr-only">{t("progress.quizzes")}</caption>
                <tbody>
                  {quizzes.slice(0, 8).map((q) => (
                    <tr key={q.id} className="border-t border-ink/10">
                      <td className="py-1.5">
                        <Link to={`/learn/${q.mentor_id}/quiz?item=${q.id}`} className="hover:underline" dir="auto">
                          {q.topic}
                        </Link>
                      </td>
                      <td className="py-1.5 text-slate-deep">{MENTOR_BY_ID[q.mentor_id].name}</td>
                      <td className="py-1.5 text-end font-medium">
                        {q.correct}/{q.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="p-6">
          <h2 className="font-display text-2xl">{t("progress.strengths")}</h2>
          {(stats?.strengths ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-slate-deep">{t("progress.noData")}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {stats!.strengths.map((s) => (
                <li key={`${s.mentor_id}-${s.topic}`} className="flex items-center justify-between gap-2">
                  <span dir="auto">{s.topic}</span>
                  <Badge tone="teal">{Math.round(s.accuracy * 100)}%</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-6">
          <h2 className="font-display text-2xl">{t("progress.practice")}</h2>
          {(stats?.needs_practice ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-slate-deep">{t("progress.noData")}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {stats!.needs_practice.map((w) => (
                <li key={`${w.mentor_id}-${w.topic}`} className="flex items-center justify-between gap-2">
                  <span dir="auto">{w.topic}</span>
                  <Link
                    to={`/learn/${w.mentor_id}/quiz`}
                    onClick={() => setTopic(w.mentor_id, w.topic)}
                    className="shrink-0 rounded-full border border-terracotta px-3 py-1 text-xs font-medium text-terracotta-deep hover:bg-terracotta/10"
                  >
                    {t("exp.quiz.name")}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-6">
          <h2 className="flex items-center gap-2 font-display text-2xl">
            <GraduationCap className="size-5 text-gold-deep" aria-hidden="true" /> {t("exp.teachback.name")}
          </h2>
          {(stats?.teachback ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-slate-deep">{t("progress.noData")}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {stats!.teachback.slice(0, 6).map((tb, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate" dir="auto">
                    {tb.topic}
                  </span>
                  <Badge tone={Number(tb.score) >= 2 ? "teal" : "gold"}>
                    {t(TEACH_LEVEL[Math.round(Number(tb.score))] ?? "teach.level0")}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <h2 className="font-display text-2xl">{t("progress.topics")}</h2>
        {(stats?.topics ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-slate-deep">{t("progress.noData")}</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {stats!.topics.map((tp) => (
              <li key={`${tp.mentor_id}-${tp.topic}`}>
                <Link
                  to={`/learn/${tp.mentor_id}`}
                  onClick={() => setTopic(tp.mentor_id, tp.topic)}
                  className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-paper py-1 pe-3 ps-1 text-sm hover:bg-ink/5"
                  title={formatRelative(tp.last)}
                >
                  <MentorAvatar mentor={MENTOR_BY_ID[tp.mentor_id]} size={24} />
                  <span dir="auto">{tp.topic}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
