import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/primitives";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-sm text-slate-deep">
        <Icon className="size-4 text-gold-deep" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 font-display text-4xl leading-none">{value}</p>
      {hint && <p className="mt-2 text-xs text-slate-deep">{hint}</p>}
    </Card>
  );
}
