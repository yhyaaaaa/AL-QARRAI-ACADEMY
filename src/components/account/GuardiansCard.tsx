import { useEffect, useState, type FormEvent } from "react";
import { HeartHandshake, Loader2, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card, Input, Label } from "@/components/ui/primitives";
import { data } from "@/services/data";
import { api } from "@/services/api";
import type { GuardianLink } from "@/types";

/** Student view: who can follow my progress, add a guardian, (re)send invitations. */
export function GuardiansCard() {
  const [links, setLinks] = useState<GuardianLink[] | null>(null);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    data
      .guardianLinks()
      .then((l) => !cancelled && setLinks(l))
      .catch(
        (e: unknown) =>
          !cancelled && setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }),
      );
    return () => {
      cancelled = true;
    };
  }, [reload]);

  async function run(fn: () => Promise<string>) {
    setBusy(true);
    setMsg(null);
    try {
      setMsg({ ok: true, text: await fn() });
      setReload((r) => r + 1);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    await run(async () => {
      await data.addGuardian(email.trim());
      const r = await api.inviteGuardians();
      setEmail("");
      return r.results.some((x) => x.result === "invited")
        ? "Added. We emailed them an invitation to the parent dashboard."
        : "Added. They'll see your progress after signing in to their parent account with that email.";
    });
  }

  return (
    <Card className="mt-6 p-6" data-testid="guardians-card">
      <h2 className="flex items-center gap-2 font-display text-2xl">
        <HeartHandshake className="size-5 text-gold-deep" aria-hidden="true" /> Parents &amp;
        guardians
      </h2>
      <p className="mt-1 text-sm text-slate-deep">
        Linked guardians can see your progress, session topics and exercise results, but not your
        conversations.
      </p>

      {links === null ? (
        <p className="mt-4 text-sm text-slate-deep">Loading…</p>
      ) : links.length === 0 ? (
        <p className="mt-4 text-sm text-slate-deep">No guardian added.</p>
      ) : (
        <ul className="mt-4 divide-y divide-ink/10">
          {links.map((l) => (
            <li key={l.id} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm">{l.guardian_email}</span>
              <Badge tone={l.status === "active" ? "teal" : "gold"}>
                {l.status === "active" ? "Linked" : "Invitation pending"}
              </Badge>
              <button
                type="button"
                className="cursor-pointer rounded-full p-1 text-slate-deep hover:bg-ink/5"
                aria-label={`Remove ${l.guardian_email}`}
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await data.revokeGuardian(l.id);
                    return "Guardian removed.";
                  })
                }
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="mt-4 flex flex-wrap items-end gap-2">
        <div className="min-w-56 flex-1">
          <Label htmlFor="gmail">Add a parent's email</Label>
          <Input id="gmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy || !email.trim()}>
          {busy ? <Loader2 className="animate-spin" /> : <Send />} Add &amp; invite
        </Button>
      </form>
      {msg && (
        <p
          role="status"
          className={msg.ok ? "mt-2 text-sm text-teal-deep" : "mt-2 text-sm text-terracotta-deep"}
        >
          {msg.text}
        </p>
      )}
    </Card>
  );
}
