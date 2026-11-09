import { Link } from "react-router-dom";
import { useLocalizedMentor } from "@/data/mentorText";
import { ArrowRight } from "lucide-react";
import { mentorStyle, type MentorProfile } from "@/data/mentors";
import { MentorCharacter } from "./MentorPortrait";
import { Badge } from "@/components/ui/primitives";
import { useT } from "@/i18n/strings";
import { cn } from "@/lib/utils";

export function MentorCard({ mentor: baseMentor, to, className }: { mentor: MentorProfile; to: string; cta?: string; className?: string }) {
  const t = useT();
  const mentor = useLocalizedMentor(baseMentor);
  return (
    <article
      style={mentorStyle(mentor)}
      className={cn("group flex flex-col overflow-hidden rounded-3xl border border-ink/10 bg-paper shadow-[var(--shadow-card)]", className)}
      data-testid={`mentor-card-${mentor.id}`}
    >
      <div className="bg-[var(--mentor-soft)] px-10 pt-6">
        <MentorCharacter mentor={mentor} className="mx-auto max-w-[240px]" />
      </div>
      <div className="flex flex-1 flex-col gap-4 p-6">
        <header>
          <h3 className="font-display text-3xl leading-tight">{mentor.name}</h3>
          <p className="font-ar text-lg text-[var(--mentor-deep)]" lang="ar" dir="rtl">
            {mentor.nameAr}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-deep">{mentor.domain}</p>
        </header>
        <p className="text-sm leading-relaxed text-ink/80">{mentor.description}</p>
        <ul className="flex flex-wrap gap-1.5" aria-label={t("a11y.personality")}>
          {mentor.personality.map((p) => (
            <li key={p}>
              <Badge tone="mentor">{p}</Badge>
            </li>
          ))}
        </ul>
        <Link
          to={to}
          className="mt-auto inline-flex min-h-12 items-center justify-between rounded-full bg-[var(--mentor-deep)] px-5 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          {t("landing.meet", { name: mentor.name })}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
