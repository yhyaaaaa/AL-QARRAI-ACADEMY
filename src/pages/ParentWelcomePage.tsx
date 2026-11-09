import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Input, Label } from "@/components/ui/primitives";
import { requireSupabase } from "@/services/supabase/client";
import { useAuth } from "@/store/authStore";
import { data } from "@/services/data";
import { validatePassword } from "@/utils/validation";
import { useT } from "@/i18n/strings";

/** Landing page of the guardian invitation email: the parent chooses a nickname and a password. */
export function ParentWelcomePage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const [name, setName] = useState(
    profile?.display_name === "Parent" ? "" : (profile?.display_name ?? ""),
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const nick = name.trim();
    if (nick.length < 2 || nick.length > 40)
      return setError(t("pw.nameInvalid"));
    const pw = validatePassword(password);
    if (pw) return setError(t(pw));
    if (password !== confirm) return setError(t("val.pwMismatch"));
    setBusy(true);
    setError(null);
    try {
      const { error: authErr } = await requireSupabase().auth.updateUser({ password });
      if (authErr) throw new Error(authErr.message);
      await data.updateProfile(user!.id, { display_name: nick });
      await refreshProfile();
      navigate("/parent", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("acc.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <Card className="p-8">
        <h1 className="font-display text-3xl">{t("pw.title")}</h1>
        <p className="mt-2 text-sm text-slate-deep">
          {t("pw.intro", { email: user?.email ?? "" })}
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <Label htmlFor="pname">{t("pw.name")}</Label>
            <Input
              id="pname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
            />
          </div>
          <div>
            <Label htmlFor="ppw">{t("auth.password")}</Label>
            <Input
              id="ppw"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-deep">
              {t("val.pwHint")}
            </p>
          </div>
          <div>
            <Label htmlFor="ppw2">{t("auth.confirmPassword")}</Label>
            <Input
              id="ppw2"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-terracotta-deep">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} {t("pw.save")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
