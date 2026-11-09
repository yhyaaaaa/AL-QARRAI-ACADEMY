import { MENTORS } from "@/data/mentors";
import { MentorCard } from "@/components/mentors/MentorCard";

export function MentorSelectionPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <header className="max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-gold-deep">
          Choose your mentor
        </p>
        <h1 className="mt-1 font-display text-4xl">Who will guide you today?</h1>
        <p className="mt-3 text-ink/75">
          Each mentor is a specialist with their own method. You can switch mentors at any time from
          the learning space, and each one will point you to a colleague when a question falls
          outside their field.
        </p>
      </header>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {MENTORS.map((m) => (
          <MentorCard key={m.id} mentor={m} to={`/learn/${m.id}`} />
        ))}
      </div>
      <section className="mt-12 grid gap-4 md:grid-cols-3" aria-label="Teaching methods">
        {MENTORS.map((m) => (
          <div key={m.id} className="rounded-2xl border border-ink/10 bg-paper/60 p-5">
            <h2 className="font-display text-xl">How {m.firstName} teaches</h2>
            <ul className="mt-3 space-y-1.5 text-sm text-ink/80">
              {m.methodology.map((x) => (
                <li key={x} className="flex gap-2">
                  <span
                    className="mt-2 size-1.5 shrink-0 rounded-full"
                    style={{ background: m.color.base }}
                  />
                  {x}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
