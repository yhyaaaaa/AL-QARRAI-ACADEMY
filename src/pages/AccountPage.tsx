import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Loader2, LogOut, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Card, Input, Label } from "@/components/ui/primitives";
import { useAuth } from "@/store/authStore";
import { data } from "@/services/data";
import { api } from "@/services/api";
import { GuardiansCard } from "@/components/account/GuardiansCard";

const AGE_LABEL = {
  under_13: "Under 13",
  "13_15": "13 – 15",
  "16_17": "16 – 17",
  "18_plus": "18 or older",
} as const;

export function AccountPage() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [language, setLanguage] = useState(profile?.preferred_language ?? "auto");
  const [status, setStatus] = useState<{ tone: "teal" | "terracotta"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const nick = name.trim();
    if (nick.length < 2 || nick.length > 40 || /@|\d{6,}/.test(nick)) {
      return setStatus({
        tone: "terracotta",
        text: "Choose a nickname of 2–40 characters without an email or phone number.",
      });
    }
    setBusy("save");
    try {
      await data.updateProfile(user.id, { display_name: nick, preferred_language: language });
      await refreshProfile();
      setStatus({ tone: "teal", text: "Saved." });
    } catch (err) {
      setStatus({
        tone: "terracotta",
        text: err instanceof Error ? err.message : "Could not save.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function exportData() {
    setBusy("export");
    try {
      const dump = await api.exportAccount();
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `qarrai-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      setStatus({
        tone: "terracotta",
        text: err instanceof Error ? err.message : "Export failed.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function deleteAccount() {
    setBusy("delete");
    try {
      await api.deleteAccount();
      await signOut();
      navigate("/", { replace: true });
    } catch (err) {
      setStatus({
        tone: "terracotta",
        text: err instanceof Error ? err.message : "Deletion failed.",
      });
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-4xl">Your account</h1>
      <p className="mt-1 text-sm text-slate-deep">
        {user?.email} ·{" "}
        {profile?.account_type === "parent"
          ? "Parent account"
          : `Age group: ${profile?.age_band ? AGE_LABEL[profile.age_band] : "…"}`}
        {profile?.guardian_consent_at &&
          ` · Guardian consent recorded ${new Date(profile.guardian_consent_at).toLocaleDateString()}`}
      </p>

      {status && (
        <Alert tone={status.tone} className="mt-4">
          <span role="status">{status.text}</span>
        </Alert>
      )}

      <Card className="mt-6 p-6">
        <h2 className="font-display text-2xl">Profile</h2>
        <form onSubmit={save} className="mt-4 space-y-4">
          <div>
            <Label htmlFor="nick">Nickname</Label>
            <Input
              id="nick"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
            />
          </div>
          <div>
            <Label htmlFor="lang">Mentors reply in</Label>
            <select
              id="lang"
              value={language}
              onChange={(e) => setLanguage(e.target.value as typeof language)}
              className="h-11 w-full rounded-xl border border-ink/15 bg-paper px-3 text-sm"
            >
              <option value="auto">The language I write in</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="ar">العربية</option>
            </select>
          </div>
          <Button type="submit" disabled={busy !== null}>
            {busy === "save" && <Loader2 className="animate-spin" />} Save
          </Button>
        </form>
      </Card>

      {profile?.account_type === "student" && <GuardiansCard />}

      <Card className="mt-6 p-6">
        <h2 className="flex items-center gap-2 font-display text-2xl">
          <ShieldCheck className="size-5 text-teal-deep" aria-hidden="true" /> Privacy &amp;
          security
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={exportData}
            disabled={busy !== null}
            data-testid="export-data"
          >
            {busy === "export" ? <Loader2 className="animate-spin" /> : <Download />} Download my
            data
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              await signOut("global");
              navigate("/login", { replace: true });
            }}
            disabled={busy !== null}
          >
            <LogOut /> Sign out on all devices
          </Button>
        </div>
      </Card>

      <Card className="mt-6 border-terracotta/40 p-6">
        <h2 className="flex items-center gap-2 font-display text-2xl text-terracotta-deep">
          <Trash2 className="size-5" aria-hidden="true" /> Delete account
        </h2>
        <p className="mt-2 text-sm text-ink/80">
          This permanently deletes the account, every conversation, exercise, progress record and
          uploaded document. It cannot be undone. Type <strong>DELETE</strong> to confirm.
        </p>
        <div className="mt-3 flex gap-2">
          <Input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-label="Type DELETE to confirm"
            className="max-w-40"
          />
          <Button
            variant="outline"
            className="border-terracotta-deep text-terracotta-deep hover:bg-terracotta/10"
            disabled={confirm !== "DELETE" || busy !== null}
            onClick={deleteAccount}
            data-testid="delete-account"
          >
            {busy === "delete" && <Loader2 className="animate-spin" />} Delete everything
          </Button>
        </div>
      </Card>
    </div>
  );
}
