import { Link } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { MENTOR_BY_ID } from "@/data/mentors";
import { MentorAvatar } from "@/components/mentors/MentorPortrait";
import { formatRelative } from "@/utils/format";
import type { SessionSummary } from "@/types";

export function RecentSessions({
  sessions,
  limit = 5,
}: {
  sessions: SessionSummary[];
  limit?: number;
}) {
  if (sessions.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-ink/20 p-6 text-center text-sm text-slate-deep">
        No sessions yet. Pick a mentor to start your first one.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-ink/10">
      {sessions.slice(0, limit).map((s) => {
        const m = MENTOR_BY_ID[s.mentor_id];
        return (
          <li key={s.id}>
            <Link
              to={`/learn/${s.mentor_id}?session=${s.id}`}
              className="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-ink/5"
            >
              <MentorAvatar mentor={m} size={38} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium" dir="auto">
                  {s.title}
                </p>
                <p className="text-xs text-slate-deep">
                  {m.firstName} · {formatRelative(s.updated_at)}
                </p>
              </div>
              <span className="flex items-center gap-1 text-xs text-slate-deep">
                <MessageSquare className="size-3.5" aria-hidden="true" /> {s.message_count}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
