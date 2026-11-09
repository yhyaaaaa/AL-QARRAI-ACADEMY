import { useState } from "react";
import { ChevronDown, HeartHandshake, ShieldAlert, ShieldCheck } from "lucide-react";
import type { MessageRow } from "@/types";
import { cn } from "@/lib/utils";

/** Transparent provenance for every mentor reply: verified, unverified fallback, or safety response. */
export function ValidationBadge({ message }: { message: MessageRow }) {
  const [open, setOpen] = useState(false);
  const ai = message.meta?.ai;
  const last = ai?.validation.at(-1);

  if (message.status === "safety") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-medium text-gold-deep"
        data-testid="badge-safety"
      >
        <HeartHandshake className="size-3" aria-hidden="true" /> Safety response (no AI was used)
      </span>
    );
  }
  if (!ai) return null;

  const verified = message.status === "validated";
  return (
    <div className="text-[11px]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 font-medium",
          verified ? "bg-teal/15 text-teal-deep" : "bg-terracotta/15 text-terracotta-deep",
        )}
        data-testid={verified ? "badge-verified" : "badge-fallback"}
      >
        {verified ? (
          <ShieldCheck className="size-3" aria-hidden="true" />
        ) : (
          <ShieldAlert className="size-3" aria-hidden="true" />
        )}
        {verified
          ? `Verified by ${last?.validatorModel ?? "validator"}`
          : "Not verified · clarification requested"}
        <ChevronDown
          className={cn("size-3 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {open && (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg bg-ink/5 p-3 text-slate-deep">
          <dt className="font-medium text-ink">Task</dt>
          <dd>
            {ai.task} (classified by {ai.classifiedBy})
          </dd>
          <dt className="font-medium text-ink">Draft model</dt>
          <dd>{ai.draftModel}</dd>
          <dt className="font-medium text-ink">Attempts</dt>
          <dd>{ai.attempts} (max 2: draft + one correction)</dd>
          <dt className="font-medium text-ink">Arithmetic</dt>
          <dd>
            {last && last.arithmeticChecked > 0
              ? `${last.arithmeticChecked} statement(s) re-computed deterministically`
              : "no explicit calculations to check"}
          </dd>
          <dt className="font-medium text-ink">Confidence</dt>
          <dd>
            {last
              ? `${Math.round(last.confidence * 100)}% (validator self-report, not proof)`
              : "–"}
          </dd>
          <dt className="font-medium text-ink">Latency</dt>
          <dd>{(ai.latencyMs / 1000).toFixed(1)} s</dd>
          {ai.validation.some((v) => v.issues.length > 0) && (
            <>
              <dt className="font-medium text-ink">Issues found</dt>
              <dd>
                <ul className="list-disc ps-4">
                  {ai.validation.flatMap((v, i) =>
                    v.issues.map((x, j) => (
                      <li key={`${i}-${j}`}>
                        Attempt {i + 1}: {x}
                      </li>
                    )),
                  )}
                </ul>
              </dd>
            </>
          )}
        </dl>
      )}
    </div>
  );
}
