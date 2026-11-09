import { Award, Lock } from "lucide-react";
import { useT } from "@/i18n/strings";
import type { Achievement } from "@/utils/achievements";
import { cn } from "@/lib/utils";

export function AchievementList({ items, compact = false }: { items: Achievement[]; compact?: boolean }) {
  const t = useT();
  const shown = compact ? [...items].sort((a, b) => Number(b.earned) - Number(a.earned) || b.progress - a.progress).slice(0, 4) : items;
  return (
    <ul className={cn("grid gap-3", compact ? "grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4")} data-testid="achievements">
      {shown.map((a) => (
        <li
          key={a.id}
          className={cn(
            "flex gap-3 rounded-2xl border p-3",
            a.earned ? "border-gold bg-gold/15" : "border-ink/10 bg-paper",
          )}
          aria-label={`${t(a.name)}: ${a.earned ? t(a.desc) : t("ach.locked")}`}
        >
          <span
            className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", a.earned ? "bg-gold text-ink" : "bg-ink/5 text-slate-deep")}
            aria-hidden="true"
          >
            {a.earned ? <Award className="size-5" /> : <Lock className="size-4" />}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{t(a.name)}</span>
            <span className="block text-xs text-slate-deep">{t(a.desc)}</span>
            {!a.earned && a.progress > 0 && (
              <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-ink/10" aria-hidden="true">
                <span className="block h-full rounded-full bg-gold-deep" style={{ width: `${a.progress * 100}%` }} />
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
