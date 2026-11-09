import { Link } from "react-router-dom";
import { ArrowRight, BookOpenCheck, MessagesSquare, ShieldCheck, Sparkles } from "lucide-react";
import { MENTORS, mentorStyle } from "@/data/mentors";
import { MentorPortrait } from "@/components/mentors/MentorPortrait";
import { MentorCard } from "@/components/mentors/MentorCard";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/strings";

const STEPS = [
  {
    icon: Sparkles,
    title: "Choose your mentor",
    text: "Mathematics, sciences or languages. Each mentor has their own expertise, personality and method.",
  },
  {
    icon: MessagesSquare,
    title: "Ask, or bring your material",
    text: "Ask a question in Arabic, French or English, or attach your course notes for context.",
  },
  {
    icon: ShieldCheck,
    title: "Answers are checked first",
    text: "A second model reviews every answer, and arithmetic is re-computed deterministically, before you see it.",
  },
  {
    icon: BookOpenCheck,
    title: "Practise and progress",
    text: "Generate exercises, check your answers, and follow your progress across subjects.",
  },
];

export function LandingPage() {
  const t = useT();
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-paper-grain">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/60 bg-paper px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gold-deep">
              The Modern House of Knowledge
            </p>
            <h1 className="font-display text-5xl leading-[1.05] text-ink sm:text-6xl">
              Three mentors.
              <br />
              Three ways of thinking.
              <br />
              <span className="text-teal-deep">One academy.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/80">
              Qarrai Academy is not another generic chatbot. It is an academy of specialised AI
              mentors, each with their own domain, personality and teaching method, sharing one
              engine that checks every answer before it reaches you.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/register">
                  {t("nav.start")} <ArrowRight className="rtl:-scale-x-100" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#mentors">Meet the mentors</a>
              </Button>
            </div>
          </div>

          <div className="flex items-end justify-center gap-3 sm:gap-5" aria-hidden="true">
            {MENTORS.map((m, i) => (
              <div
                key={m.id}
                className={i === 1 ? "w-[34%] translate-y-0" : "w-[30%] translate-y-6"}
                style={mentorStyle(m)}
              >
                <MentorPortrait mentor={m} className="w-full drop-shadow-sm" />
                <p className="mt-2 text-center font-display text-sm text-ink sm:text-base">
                  {m.firstName}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MENTORS */}
      <section id="mentors" className="mx-auto max-w-7xl scroll-mt-16 px-4 py-20 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <h2 className="font-display text-4xl">Meet your mentors</h2>
          <p className="mt-3 text-ink/75">
            One shared tutoring engine, three distinct educators. Each mentor has an independent
            configuration of expertise, personality and pedagogy.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {MENTORS.map((m) => (
            <MentorCard key={m.id} mentor={m} to={`/register?mentor=${m.id}`} cta="Learn" />
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-y border-ink/10 bg-parchment-deep/50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-4xl">How it works</h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="rounded-2xl bg-paper p-6 shadow-[var(--shadow-card)]">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-ink text-gold">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="font-display text-3xl text-gold-deep">{i + 1}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/75">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* WHY */}
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-4xl">Why specialised mentors?</h2>
          <p className="mt-4 leading-relaxed text-ink/80">
            Good teachers don't teach every subject the same way. A proof needs structure, a
            scientific idea needs intuition, and a sentence needs an ear for nuance. Qarrai gives
            each discipline the method it deserves and routes each request to the model best suited
            to it.
          </p>
        </div>
        <ul className="space-y-3">
          {[
            [
              "Domain-specific pedagogy",
              "Step-by-step proofs, thought experiments, constructive corrections.",
            ],
            [
              "Model routing",
              "Maths and sciences, writing and language, and code each go to a specialised model.",
            ],
            [
              "Validation before delivery",
              "No unverified draft is shown; failed checks lead to a safe clarification.",
            ],
            ["Arabic · French · English", "Multilingual mentors with right-to-left support."],
          ].map(([title, text]) => (
            <li key={title} className="flex gap-3 rounded-xl border border-ink/10 bg-paper p-4">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-teal-deep" aria-hidden="true" />
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-ink/75">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section className="bg-ink">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-4xl text-parchment">Your mentors are waiting.</h2>
            <p className="mt-2 text-parchment/75">
              Create a free student account in a minute. Students under 18 join with a parent or
              guardian.
            </p>
          </div>
          <Button asChild size="lg" variant="gold" className="md:ms-auto">
            <Link to="/register">
              Start learning <ArrowRight className="rtl:-scale-x-100" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
