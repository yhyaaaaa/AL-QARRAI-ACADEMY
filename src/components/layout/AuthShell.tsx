import type { ReactNode } from "react";
import { MENTORS } from "@/data/mentors";
import { MentorPortrait } from "@/components/mentors/MentorPortrait";
import { Card } from "@/components/ui/primitives";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-paper-grain">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2">
        <div className="hidden lg:block">
          <div className="flex items-end gap-4" aria-hidden="true">
            {MENTORS.map((m) => (
              <MentorPortrait key={m.id} mentor={m} className="w-1/3" />
            ))}
          </div>
          <p className="mt-6 font-display text-3xl leading-snug text-ink">
            “The academy is open. Choose a door, and a mentor will meet you there.”
          </p>
        </div>
        <Card className="mx-auto w-full max-w-md p-8">
          <h1 className="font-display text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-slate-deep">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </Card>
      </div>
    </div>
  );
}
