import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Loader2, LogOut, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Card, Input, Label } from "@/components/ui/primitives";
import { useAuth } from "@/store/authStore";
import { data } from "@/services/data";
import { api } from "@/services/api";
import { GuardiansCard } from "@/components/account/GuardiansCard";
import { useT } from "@/i18n/strings";
import { UI_LANGUAGES } from "@/i18n/languages";

export function AccountPage() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const t = useT();
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
      return setStatus({ tone: "terracotta", text: t("acc.nickInvalid") });
    }
    setBusy("save");
    try {
      await data.updateProfile(user.id, { display_name: nick, preferred_language: language });
      await refreshProfile();
      setStatus({ tone: "teal", text: t("common.saved") });
    } catch (err) {
      setStatus({ tone: "terracotta", text: err instanceof Error ? err.message : t("acc.saveFailed") });
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
      setStatus({ tone: "terracotta", text: err instanceof Error ? err.message : t("acc.exportFailed") });
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
      setStatus({ tone: "terracotta", text: err instanceof Error ? err.message : t("acc.deleteFailed") });
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-4xl">{t("acc.title")}</h1>
      <p className="mt-1 text-sm text-slate-deep">
        {user?.email} ·{" "}
        {profile?.account_type === "parent"
          ? t("acc.parentAccount")
          : t("acc.ageGroup", { age: profile?.age_band ? t(`age.${profile.age_band}`) : "…" })}
        {profile?.guardian_consent_at &&
          ` · ${t("acc.consentAt", { date: new Date(profile.guardian_consent_at).toLocaleDateString(document.documentElement.lang) })}`}
      </p>

      {status && (
        <Alert tone={status.tone} className="mt-4">
          <span role="status">{status.text}</span>
        </Alert>
      )}

      <Card className="mt-6 p-6">
        <h2 className="font-display text-2xl">{t("acc.profile")}</h2>
        <form onSubmit={save} className="mt-4 space-y-4">
          <div>
            <Label htmlFor="nick">{t("auth.nickname")}</Label>
            <Input id="nick" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
          </div>
          <div>
            <Label htmlFor="lang">{t("acc.replyIn")}</Label>
            <select
              id="lang"
              value={language}
              onChange={(e) => setLanguage(e.target.value as typeof language)}
              className="h-11 w-full rounded-xl border border-ink/15 bg-paper px-3 text-sm"
            >
              <option value="auto">{t("acc.replyAuto")}</option>
              {UI_LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={busy !== null}>
            {busy === "save" && <Loader2 className="animate-spin" />} {t("common.save")}
          </Button>
        </form>
      </Card>

      {profile?.account_type === "student" && <GuardiansCard />}

      <Card className="mt-6 p-6">
        <h2 className="flex items-center gap-2 font-display text-2xl">
          <ShieldCheck className="size-5 text-teal-deep" aria-hidden="true" /> {t("acc.privacy")}
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="outline" onClick={exportData} disabled={busy !== null} data-testid="export-data">
            {busy === "export" ? <Loader2 className="animate-spin" /> : <Download />} {t("acc.download")}
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              await signOut("global");
              navigate("/login", { replace: true });
            }}
            disabled={busy !== null}
          >
            <LogOut /> {t("acc.signOutAll")}
          </Button>
        </div>
      </Card>

      <Card className="mt-6 border-terracotta/40 p-6">
        <h2 className="flex items-center gap-2 font-display text-2xl text-terracotta-deep">
          <Trash2 className="size-5" aria-hidden="true" /> {t("acc.delete")}
        </h2>
        <p className="mt-2 text-sm text-ink/80">{t("acc.deleteWarn")}</p>
        <div className="mt-3 flex gap-2">
          <Input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-label={t("acc.deleteLabel")}
            className="max-w-40"
            dir="ltr"
          />
          <Button
            variant="outline"
            className="border-terracotta-deep text-terracotta-deep hover:bg-terracotta/10"
            disabled={confirm !== "DELETE" || busy !== null}
            onClick={deleteAccount}
            data-testid="delete-account"
          >
            {busy === "delete" && <Loader2 className="animate-spin" />} {t("acc.deleteAll")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
