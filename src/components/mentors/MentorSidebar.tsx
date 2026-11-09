import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { MENTORS, type MentorProfile } from "@/data/mentors";
import { MentorAvatar, MentorPortrait } from "./MentorPortrait";
import { Badge } from "@/components/ui/primitives";
import { formatRelative } from "@/utils/format";
import type { SessionSummary } from "@/types";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/strings";

export function MentorSidebar({
  mentor,
  sessions,
  activeSessionId,
  onNewSession,
}: {
  mentor: MentorProfile;
  sessions: SessionSummary[];
  activeSessionId: string | null;
  onNewSession: () => void;
}) {
  const t = useT();
  return (
    <aside className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto border-ink/10 bg-paper/70 p-5 lg:border-e">
      <div className="text-center">
        <div className="mx-auto w-40 rounded-t-full bg-[var(--mentor-soft)] px-3 pt-3">
          <MentorPortrait mentor={mentor} />
        </div>
        <h1 className="mt-3 font-display text-2xl leading-tight">{mentor.name}</h1>
        <p className="font-ar text-lg text-[var(--mentor-deep)]" lang="ar" dir="rtl">
          {mentor.nameAr}
        </p>
        <p className="text-sm text-slate-deep">{mentor.domain}</p>
        <p className="mt-3 text-sm italic text-ink/75">“{mentor.tagline}”</p>
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-deep">
          Personality
        </h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {mentor.personality.map((p) => (
            <Badge key={p} tone="mentor">
              {p}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-deep">
          Teaching method
        </h2>
        <ul className="mt-2 space-y-1 text-sm text-ink/80">
          {mentor.methodology.map((m) => (
            <li key={m} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--mentor)]" /> {m}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-deep">
          Switch mentor
        </h2>
        <div className="mt-2 flex gap-2">
          {MENTORS.filter((m) => m.id !== mentor.id).map((m) => (
            <Link
              key={m.id}
              to={`/learn/${m.id}`}
              className="flex flex-1 items-center gap-2 rounded-xl border border-ink/10 bg-paper p-2 text-xs font-medium hover:bg-ink/5"
              data-testid={`switch-${m.id}`}
            >
              <MentorAvatar mentor={m} size={30} /> {m.firstName}
            </Link>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-deep">
            Sessions
          </h2>
          <button
            type="button"
            onClick={onNewSession}
            className="ms-auto inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-[var(--mentor-deep)] hover:bg-ink/5"
            data-testid="new-session"
          >
            <Plus className="size-3.5" /> {t("chat.newSession")}
          </button>
        </div>
        {sessions.length === 0 ? (
          <p className="mt-2 text-xs text-slate-deep">No sessions with {mentor.firstName} yet.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link
                  to={`/learn/${mentor.id}?session=${s.id}`}
                  className={cn(
                    "block rounded-lg px-2.5 py-2 text-sm hover:bg-ink/5",
                    s.id === activeSessionId && "bg-[var(--mentor-soft)] font-medium",
                  )}
                >
                  <span className="line-clamp-1" dir="auto">
                    {s.title}
                  </span>
                  <span className="text-[11px] text-slate-deep">
                    {formatRelative(s.updated_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
