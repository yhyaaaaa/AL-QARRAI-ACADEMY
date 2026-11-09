import { useState, type FormEvent } from "react";
import { usePrefs } from "@/store/prefsStore";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { AuthShell } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/button";
import { Alert, Input, Label } from "@/components/ui/primitives";
import { useAuth } from "@/store/authStore";
import { validateEmail } from "@/utils/validation";
import { homeFor } from "@/lib/routes";
import { translateMessage, useT } from "@/i18n/strings";

export function LoginPage() {
  const signIn = useAuth((s) => s.signIn);
  const t = useT();
  const uiLanguage = usePrefs((s) => s.uiLanguage);
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const from = (location.state as { from?: string } | null)?.from;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const emailError = validateEmail(email);
    if (emailError) return setError(t(emailError));
    if (!password) return setError(t("val.pwEmpty"));
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      navigate(from ?? homeFor(useAuth.getState().profile?.account_type), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? translateMessage(err.message, uiLanguage) : t("auth.signInFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title={t("auth.signInTitle")} subtitle={t("auth.signInSub")}>
      {params.get("confirmed") && (
        <Alert tone="teal" className="mb-4">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-teal-deep" />
          <span>{t("auth.confirmedOk")}</span>
        </Alert>
      )}
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div>
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="password">{t("auth.password")}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-terracotta-deep" data-testid="login-error">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={busy} data-testid="login-submit">
          {busy && <Loader2 className="animate-spin" />} {t("auth.signInBtn")}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-deep">
        {t("auth.newHere")}{" "}
        <Link to="/register" className="font-medium text-teal-deep hover:underline">
          {t("auth.create")}
        </Link>
      </p>
    </AuthShell>
  );
}
