import { Link } from "react-router-dom";
import { useMentorLocalizer } from "@/data/mentorText";
import { Accessibility, ArrowRight, HeartHandshake, Sparkles } from "lucide-react";
import { MENTORS, mentorStyle } from "@/data/mentors";
import { MentorCharacter } from "@/components/mentors/MentorPortrait";
import { MentorCard } from "@/components/mentors/MentorCard";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/strings";
import { EXPERIENCES, GROUP_LABEL, type ExperienceGroup } from "@/features/learning/experiences";

export function LandingPage() {
  const t = useT();
  const L = useMentorLocalizer();
  const groups: ExperienceGroup[] = ["understand", "practise", "prove"];
  return (
    <>
      {/* hero: the three characters are the academy's front door */}
      <section className="relative overflow-hidden bg-paper-grain">
        <div className="mx-auto grid max-w-7xl items-end gap-10 px-4 pt-14 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:pt-20">
          <div className="pb-14 lg:pb-24">
            <h1 className="max-w-xl font-display text-5xl leading-[1.05] sm:text-6xl">{t("landing.title")}</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/80">{t("landing.intro")}</p>
            <p className="mt-4 max-w-xl text-sm italic text-slate-deep">{t("app.tagline")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/register">
                  {t("landing.cta")} <ArrowRight className="rtl:-scale-x-100" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#mentors">{t("landing.ctaSecondary")}</a>
              </Button>
            </div>
          </div>
          <div className="flex items-end justify-center gap-2 sm:gap-4">
            {MENTORS.map((m, i) => (
              <div key={m.id} style={mentorStyle(m)} className={i === 1 ? "w-[36%]" : "w-[30%] pb-6"}>
                <MentorCharacter mentor={m} state={i === 1 ? "talking" : "idle"} />
                <p className="mt-2 text-center font-display text-lg">{m.name}</p>
                <p className="text-center text-xs text-slate-deep">{L(m).shortDomain}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="mentors" className="mx-auto max-w-7xl scroll-mt-16 px-4 py-20 sm:px-6">
        <h2 className="font-display text-4xl">{t("landing.mentorsTitle")}</h2>
        <p className="mt-3 max-w-2xl text-ink/75">{t("landing.mentorsIntro")}</p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {MENTORS.map((m) => (
            <MentorCard key={m.id} mentor={m} to="/register" />
          ))}
        </div>
      </section>

      <section className="border-y border-ink/10 bg-parchment-deep/50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-4xl">{t("landing.expTitle")}</h2>
          <p className="mt-3 max-w-2xl text-ink/75">{t("landing.expIntro")}</p>
          <div className="mt-10 grid gap-8 lg:grid-cols-3">
            {groups.map((g) => (
              <div key={g}>
                <h3 className="font-display text-2xl">{t(GROUP_LABEL[g])}</h3>
                <ul className="mt-4 space-y-3">
                  {EXPERIENCES.filter((e) => e.group === g).map((e) => {
                    const Icon = e.icon;
                    return (
                      <li key={e.id} className="flex gap-3 rounded-2xl bg-paper p-4">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink text-gold">
                          <Icon className="size-5" aria-hidden="true" />
                        </span>
                        <span>
                          <span className="block font-semibold">{t(e.name)}</span>
                          <span className="block text-sm text-ink/75">{t(e.desc)}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-20 sm:px-6 md:grid-cols-3">
        {[
          { icon: Sparkles, title: t("landing.personalTitle"), body: t("landing.personalBody") },
          { icon: Accessibility, title: t("landing.accessTitle"), body: t("landing.accessBody") },
          { icon: HeartHandshake, title: t("landing.safetyTitle"), body: t("landing.safetyBody") },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title}>
            <Icon className="size-8 text-teal-deep" aria-hidden="true" />
            <h2 className="mt-3 font-display text-2xl">{title}</h2>
            <p className="mt-2 leading-relaxed text-ink/80">{body}</p>
          </div>
        ))}
      </section>

      <section className="bg-ink">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-4xl text-parchment">{t("landing.finalTitle")}</h2>
            <p className="mt-2 text-parchment/80">{t("landing.finalBody")}</p>
          </div>
          <Button asChild size="lg" variant="gold" className="md:ms-auto">
            <Link to="/register">
              {t("landing.cta")} <ArrowRight className="rtl:-scale-x-100" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
