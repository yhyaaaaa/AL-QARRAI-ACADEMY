import { MENTORS } from "@/data/mentors";
import { MentorCard } from "@/components/mentors/MentorCard";
import { useT } from "@/i18n/strings";

export function MentorSelectionPage() {
  const t = useT();
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <header className="max-w-2xl">
        <h1 className="font-display text-4xl">{t("landing.mentorsTitle")}</h1>
        <p className="mt-3 text-ink/75">{t("landing.mentorsIntro")}</p>
      </header>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {MENTORS.map((m) => (
          <MentorCard key={m.id} mentor={m} to={`/learn/${m.id}`} />
        ))}
      </div>
    </div>
  );
}
