import { useId } from "react";
import { useLocalizedMentor } from "@/data/mentorText";
import { Input, Label } from "@/components/ui/primitives";
import type { MentorProfile } from "@/data/mentors";
import { useT } from "@/i18n/strings";
import { useTopicStore } from "./hooks";

/** The shared topic for every activity with this mentor (kept across modules and language switches). */
export function TopicField({ mentor, compact = false }: { mentor: MentorProfile; compact?: boolean }) {
  const t = useT();
  const suggestions = useLocalizedMentor(mentor).topics;
  const id = useId();
  const topic = useTopicStore((s) => s.topics[mentor.id] ?? "");
  const setTopic = useTopicStore((s) => s.setTopic);
  return (
    <div>
      <Label htmlFor={id}>{t("space.topicLabel")}</Label>
      <Input
        id={id}
        value={topic}
        maxLength={200}
        onChange={(e) => setTopic(mentor.id, e.target.value)}
        placeholder={t("space.topicPlaceholder")}
        dir="auto"
        data-testid="topic-input"
        className="h-12 text-base"
      />
      {!compact && (
        <>
          <p className="mt-1 text-xs text-slate-deep">{t("space.topicHelp")}</p>
          <div className="mt-3 flex flex-wrap gap-2" aria-label={t("space.suggested")}>
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setTopic(mentor.id, s)}
                aria-pressed={topic === s}
                className="min-h-9 cursor-pointer rounded-full border border-ink/15 bg-paper px-3 text-sm hover:border-[var(--mentor)] aria-pressed:border-[var(--mentor-deep)] aria-pressed:bg-[var(--mentor-soft)]"
              >
                {s}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
