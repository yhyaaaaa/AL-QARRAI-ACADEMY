import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { History, Sparkles } from "lucide-react";
import type { MentorProfile } from "@/data/mentors";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { useT } from "@/i18n/strings";
import type { LearningItem } from "@/types/learning";
import type { Experience } from "./experiences";
import { TopicField } from "./TopicField";
import { useTopic } from "./hooks";
import { ErrorState, WorkingState } from "./ui";
import { formatRelative } from "@/utils/format";

/**
 * Setup → working → result flow shared by every generated activity.
 * `options` renders module-specific choices; `children` renders the generated item.
 */
export function ActivityFrame<T extends LearningItem>({
  mentor,
  experience,
  item,
  history,
  pending,
  loadingItem,
  error,
  options,
  onGenerate,
  onNew,
  children,
}: {
  mentor: MentorProfile;
  experience: Experience;
  item: T | null;
  history: LearningItem[];
  pending: boolean;
  loadingItem: boolean;
  error: string | null;
  options?: ReactNode;
  onGenerate: (topic: string) => void;
  onNew: () => void;
  children: (item: T) => ReactNode;
}) {
  const t = useT();
  const topic = useTopic(mentor.id);

  if (pending) return <WorkingState mentor={mentor} label={t("act.generating", { name: mentor.name })} />;
  if (loadingItem) return <p className="text-slate-deep">{t("common.loading")}</p>;

  if (item) {
    return (
      <div className="space-y-4">
        {children(item)}
        <div className="flex flex-wrap gap-2 border-t border-ink/10 pt-4">
          <Button variant="outline" onClick={onNew} data-testid="activity-new">
            <Sparkles /> {t("common.new")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <ErrorState message={error} onRetry={topic.length >= 2 ? () => onGenerate(topic) : undefined} />}
      <Card className="space-y-5 p-5 sm:p-6">
        <TopicField mentor={mentor} />
        {options}
        <Button
          variant="mentor"
          size="lg"
          disabled={topic.length < 2}
          onClick={() => onGenerate(topic)}
          data-testid="activity-generate"
        >
          <Sparkles /> {t("act.generate")} · {t(experience.name)}
        </Button>
        {topic.length < 2 && <p className="text-sm text-slate-deep">{t("space.needTopic")}</p>}
      </Card>

      {history.length > 0 && (
        <section aria-labelledby="history-title" data-focus-hide>
          <h2 id="history-title" className="flex items-center gap-2 font-display text-xl">
            <History className="size-5 text-slate-deep" aria-hidden="true" /> {t("act.history")}
          </h2>
          <ul className="mt-2 divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-paper">
            {history.map((h) => (
              <li key={h.id}>
                <Link
                  to={`?item=${h.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-ink/5"
                >
                  <span className="truncate" dir="auto">
                    {h.topic}
                  </span>
                  <span className="shrink-0 text-xs text-slate-deep">{formatRelative(h.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
