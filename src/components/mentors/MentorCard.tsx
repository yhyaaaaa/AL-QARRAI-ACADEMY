import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { mentorStyle, type MentorProfile } from "@/data/mentors";
import { MentorPortrait } from "./MentorPortrait";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export function MentorCard({
  mentor,
  to,
  cta = "Start learning",
  className,
}: {
  mentor: MentorProfile;
  to: string;
  cta?: string;
  className?: string;
}) {
  return (
    <article
      style={mentorStyle(mentor)}
      className={cn(
        "group flex flex-col overflow-hidden rounded-3xl border border-ink/10 bg-paper shadow-[var(--shadow-card)] transition-transform hover:-translate-y-1",
        className,
      )}
      data-testid={`mentor-card-${mentor.id}`}
    >
      <div className="relative bg-[var(--mentor-soft)] px-10 pt-8">
        <MentorPortrait mentor={mentor} className="mx-auto w-full max-w-[220px]" />
        <span className="absolute start-4 top-4">
          <Badge tone="ink">{mentor.shortDomain}</Badge>
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-6">
        <header>
          <h3 className="font-display text-2xl leading-tight">{mentor.name}</h3>
          <p className="font-ar text-lg text-[var(--mentor-deep)]" lang="ar" dir="rtl">
            {mentor.nameAr}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-deep">{mentor.domain}</p>
        </header>
        <p className="text-sm leading-relaxed text-ink/80">{mentor.description}</p>
        <ul className="flex flex-wrap gap-1.5" aria-label="Personality">
          {mentor.personality.map((p) => (
            <li key={p}>
              <Badge tone="mentor">{p}</Badge>
            </li>
          ))}
        </ul>
        <Link
          to={to}
          className="mt-auto inline-flex items-center justify-between rounded-full bg-[var(--mentor-deep)] px-5 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          {cta} with {mentor.firstName}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100" />
        </Link>
      </div>
    </article>
  );
}
