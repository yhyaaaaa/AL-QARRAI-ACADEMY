import { FileText, ShieldCheck } from "lucide-react";
import type { ExerciseView, MessageRow } from "@/types";
import type { MentorProfile } from "@/data/mentors";
import { MentorAvatar } from "@/components/mentors/MentorPortrait";
import { ExerciseCard } from "@/components/exercises/ExerciseCard";
import { MarkdownContent } from "./MarkdownContent";
import { ValidationBadge } from "./ValidationBadge";
import { ReadAloudButton } from "@/features/learning/ui";
import { useT } from "@/i18n/strings";
import { cn } from "@/lib/utils";

export function MessageBubble({
  message,
  mentor,
  exercise,
  onExerciseUpdate,
}: {
  message: MessageRow;
  mentor: MentorProfile;
  exercise?: ExerciseView;
  onExerciseUpdate: (e: ExerciseView) => void;
}) {
  const t = useT();
  if (message.role === "user") {
    return (
      <div className="flex flex-col items-end gap-1" data-testid="msg-user">
        <div className="max-w-[85%] rounded-2xl rounded-ee-md bg-ink px-4 py-3 text-parchment shadow-sm sm:max-w-[75%]">
          {message.meta?.documentName && (
            <p className="mb-1.5 flex items-center gap-1 text-xs text-gold">
              <FileText className="size-3" aria-hidden="true" /> {message.meta.documentName}
            </p>
          )}
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed" dir="auto">
            {message.content}
          </p>
        </div>
        {message.redacted && (
          <p
            className="flex items-center gap-1 text-[11px] text-slate-deep"
            data-testid="redacted-note"
          >
            <ShieldCheck className="size-3 text-teal-deep" aria-hidden="true" />
            {t("chat.redacted")}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3" data-testid="msg-assistant">
      <MentorAvatar mentor={mentor} size={36} className="mt-1" />
      <div
        className={cn(
          "min-w-0 max-w-[92%] rounded-2xl rounded-ss-md border bg-paper px-4 py-3 shadow-sm sm:max-w-[80%]",
          message.status === "fallback" && "border-terracotta/40",
          message.status === "safety" && "border-gold/60",
          !message.status || message.status === "validated" ? "border-ink/10" : "",
        )}
      >
        <p className="mb-1 text-xs font-semibold text-[var(--mentor-deep)]">{mentor.name}</p>
        {exercise ? (
          <ExerciseCard exercise={exercise} onUpdate={onExerciseUpdate} />
        ) : (
          <MarkdownContent>{message.content}</MarkdownContent>
        )}
        <div className="mt-2">
          <div className="flex flex-wrap items-center gap-2">
            <ValidationBadge message={message} mentorName={mentor.name} />
            {!exercise && <ReadAloudButton id={message.id} text={message.content} className="-my-1" />}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TypingIndicator({ mentor, stage }: { mentor: MentorProfile; stage: string }) {
  return (
    <div className="flex items-start gap-3" role="status" aria-live="polite" data-testid="typing">
      <MentorAvatar mentor={mentor} size={36} className="mt-1" />
      <div className="rounded-2xl rounded-ss-md border border-ink/10 bg-paper px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="typing-dot size-2 rounded-full bg-[var(--mentor)]"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <p className="mt-1.5 text-xs text-slate-deep">{stage}</p>
      </div>
    </div>
  );
}
