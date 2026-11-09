import type { ReactNode } from "react";
import { MENTORS } from "@/data/mentors";
import { MentorCharacter } from "@/components/mentors/MentorPortrait";
import { useT } from "@/i18n/strings";
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
  const t = useT();
  return (
    <div className="bg-paper-grain">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2">
        <div className="hidden lg:block">
          <div className="flex items-end gap-4" aria-hidden="true">
            {MENTORS.map((m) => (
              <MentorCharacter key={m.id} mentor={m} state="idle" className="w-1/3" decorative />
            ))}
          </div>
          <p className="mt-6 font-display text-3xl leading-snug text-ink">
            “{t("auth.shellQuote")}”
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
