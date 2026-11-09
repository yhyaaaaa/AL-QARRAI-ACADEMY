/** Shared building blocks for the nine learning modules (one design, every mentor). */
import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Loader2, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { mentorStyle, type MentorProfile, type MentorState } from "@/data/mentors";
import { MentorCharacter } from "@/components/mentors/MentorPortrait";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/primitives";
import { useT } from "@/i18n/strings";
import { useSpeech } from "./hooks";
import type { Experience } from "./experiences";
import { cn } from "@/lib/utils";

/** Page frame for a module: back link, character in its live state, title, then content. */
export function ModuleShell({
  mentor,
  experience,
  state,
  topic,
  children,
  aside,
}: {
  mentor: MentorProfile;
  experience: Experience;
  state: MentorState;
  topic?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  const t = useT();
  const Icon = experience.icon;
  return (
    <div style={mentorStyle(mentor)} className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6" data-testid={`module-${experience.id}`}>
      <Link
        to={`/learn/${mentor.id}`}
        className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-medium text-[var(--mentor-deep)] hover:bg-ink/5"
      >
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        {t("space.backTo", { name: mentor.name })}
      </Link>
      <div className="mt-4 grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block" data-focus-hide>
          <div className="sticky top-4">
            <MentorCharacter mentor={mentor} state={state} className="w-full" />
            <p className="mt-3 text-center font-display text-xl">{mentor.name}</p>
            <p className="text-center font-ar text-[var(--mentor-deep)]" lang="ar" dir="rtl">
              {mentor.nameAr}
            </p>
            {aside}
          </div>
        </aside>
        <section aria-labelledby="module-title" className="min-w-0">
          <header className="flex items-start gap-3">
            <div className="w-16 shrink-0 lg:hidden">
              <MentorCharacter mentor={mentor} state={state} frame={false} />
            </div>
            <div>
              <h1 id="module-title" className="flex items-center gap-2 font-display text-3xl sm:text-4xl">
                <Icon className="size-7 text-[var(--mentor-deep)]" aria-hidden="true" />
                {t(experience.name)}
              </h1>
              <p className="mt-1 text-slate-deep">{topic ? t("act.fromTopic", { topic }) : t(experience.desc)}</p>
            </div>
          </header>
          <div className="mt-6">{children}</div>
        </section>
      </div>
    </div>
  );
}

/** The mentor at work: used while something is being generated or checked. */
export function WorkingState({ mentor, label }: { mentor: MentorProfile; label: string }) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-3xl border border-ink/10 bg-paper px-6 py-10 text-center"
      role="status"
      aria-live="polite"
      data-testid="working"
    >
      <div className="w-32">
        <MentorCharacter mentor={mentor} state="thinking" frame={false} decorative />
      </div>
      <p className="flex items-center gap-2 text-slate-deep">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" /> {label}
      </p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const t = useT();
  return (
    <Alert tone="terracotta" data-testid="module-error">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-terracotta-deep" aria-hidden="true" />
      <span className="flex-1" role="alert">
        {message}
      </span>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RotateCcw /> {t("common.retry")}
        </Button>
      )}
    </Alert>
  );
}

/** Read-aloud toggle, shown only when the browser supports it and the learner kept it enabled. */
export function ReadAloudButton({ id, text, className }: { id: string; text: string; className?: string }) {
  const t = useT();
  const { supported, speakingId, speak, stop } = useSpeech();
  if (!supported) return null;
  const active = speakingId === id;
  return (
    <button
      type="button"
      onClick={() => (active ? stop() : speak(id, text))}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-medium text-[var(--mentor-deep)] hover:bg-ink/5",
        className,
      )}
    >
      {active ? <VolumeX className="size-4" aria-hidden="true" /> : <Volume2 className="size-4" aria-hidden="true" />}
      {active ? t("common.stopReading") : t("common.readAloud")}
    </button>
  );
}

/** Segmented control (radio group) used for difficulty, length, level… */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      <div className="inline-flex flex-wrap gap-1 rounded-2xl bg-ink/5 p-1" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "min-h-10 cursor-pointer rounded-xl px-4 text-sm font-medium transition-colors",
              value === o.value ? "bg-paper text-ink shadow-sm ring-1 ring-[var(--mentor)]" : "text-slate-deep hover:text-ink",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
