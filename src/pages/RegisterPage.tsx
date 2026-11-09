import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Loader2, MailCheck, ShieldCheck, Users } from "lucide-react";
import { AuthShell } from "@/components/layout/AuthShell";
import { homeFor } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Alert, Input, Label } from "@/components/ui/primitives";
import { useAuth } from "@/store/authStore";
import { usePrefs } from "@/store/prefsStore";
import {
  validateRegistration,
  type RegistrationErrors,
  type RegistrationField,
} from "@/utils/validation";
import type { AccountType, AgeBand } from "@/types";
import { cn } from "@/lib/utils";
import { translateMessage, useT, type StringKey } from "@/i18n/strings";

const AGE_BANDS: AgeBand[] = ["under_13", "13_15", "16_17", "18_plus"];

export function RegisterPage() {
  const signUp = useAuth((s) => s.signUp);
  const t = useT();
  const uiLanguage = usePrefs((s) => s.uiLanguage);
  const navigate = useNavigate();

  const [accountType, setAccountType] = useState<AccountType>("student");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    guardianEmail: "",
  });
  const [ageBand, setAgeBand] = useState<AgeBand | "">("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const isStudent = accountType === "student";
  const minor = isStudent && ageBand !== "" && ageBand !== "18_plus";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const v = validateRegistration({ ...form, accountType, ageBand, consent });
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    setServerError(null);
    try {
      const { needsConfirmation } = await signUp(
        isStudent
          ? {
              accountType,
              displayName: form.name.trim(),
              email: form.email.trim(),
              password: form.password,
              ageBand: ageBand as AgeBand,
              guardianConsent: ageBand === "18_plus" ? false : consent,
              guardianEmail: form.guardianEmail.trim() || undefined,
              preferredLanguage: uiLanguage,
            }
          : {
              accountType,
              displayName: form.name.trim(),
              email: form.email.trim(),
              password: form.password,
              preferredLanguage: uiLanguage,
            },
      );
      if (needsConfirmation) setConfirmSent(true);
      else navigate(homeFor(accountType), { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? translateMessage(err.message, uiLanguage) : t("auth.registerFailed"));
    } finally {
      setBusy(false);
    }
  }

  const err = (k: RegistrationField) =>
    errors[k] ? (
      <p id={`${k}-error`} className="mt-1 text-xs text-terracotta-deep">
        {t(errors[k])}
      </p>
    ) : null;

  const field = (
    k: "name" | "email" | "password" | "confirm" | "guardianEmail",
    label: StringKey,
    type: string,
    autoComplete: string,
    hint?: StringKey,
  ) => (
    <div>
      <Label htmlFor={k}>{t(label)}</Label>
      <Input
        id={k}
        type={type}
        autoComplete={autoComplete}
        value={form[k]}
        onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
        aria-invalid={!!errors[k]}
        aria-describedby={errors[k] ? `${k}-error` : undefined}
        data-testid={`field-${k}`}
      />
      {hint && !errors[k] && <p className="mt-1 text-xs text-slate-deep">{t(hint)}</p>}
      {err(k)}
    </div>
  );

  if (confirmSent) {
    return (
      <AuthShell title={t("auth.inboxTitle")} subtitle={t("auth.inboxSub")}>
        <Alert tone="teal">
          <MailCheck className="mt-0.5 size-4 shrink-0 text-teal-deep" />
          <span data-testid="confirm-sent">
            {t("auth.confirmSent", { email: form.email })}
            {isStudent && form.guardianEmail && <> {t("auth.willInvite", { email: form.guardianEmail })}</>}
          </span>
        </Alert>
        <Button asChild variant="outline" className="mt-6 w-full">
          <Link to="/login">{t("auth.goSignIn")}</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t("auth.registerTitle")} subtitle={t("auth.registerSub")}>
      <div className="mb-5 grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("auth.accountType")}>
        {(
          [
            { value: "student", label: t("auth.iStudent"), icon: GraduationCap },
            { value: "parent", label: t("auth.iParent"), icon: Users },
          ] as const
        ).map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={accountType === value}
            onClick={() => {
              setAccountType(value);
              setErrors({});
            }}
            className={cn(
              "flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium",
              accountType === value
                ? "border-ink bg-ink text-parchment"
                : "border-ink/15 bg-paper hover:bg-ink/5",
            )}
            data-testid={`type-${value}`}
          >
            <Icon className="size-4" aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {field(
          "name",
          isStudent ? "auth.nickname" : "auth.yourName",
          "text",
          "nickname",
          isStudent ? "auth.nicknameHint" : undefined,
        )}
        {field("email", "auth.email", "email", "email")}
        {field(
          "password",
          "auth.password",
          "password",
          "new-password",
          "val.pwHint",
        )}
        {field("confirm", "auth.confirmPassword", "password", "new-password")}

        {isStudent && (
          <>
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium">{t("auth.ageGroup")}</legend>
              <div className="grid grid-cols-2 gap-2" role="radiogroup">
                {AGE_BANDS.map((b) => (
                  <label
                    key={b}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-ink/15 bg-paper px-3 py-2 text-sm has-[:checked]:border-teal-deep has-[:checked]:bg-teal/10"
                  >
                    <input
                      type="radio"
                      name="age"
                      value={b}
                      checked={ageBand === b}
                      onChange={() => setAgeBand(b)}
                      className="accent-[var(--color-teal-deep)]"
                    />
                    {t(`age.${b}`)}
                  </label>
                ))}
              </div>
              {err("ageBand")}
            </fieldset>

            <fieldset
              className="rounded-xl border border-gold/50 bg-gold/10 p-3"
              data-testid="parent-section"
            >
              <legend className="px-1 text-sm font-semibold">{t("auth.guardianLegend")}</legend>
              <p className="mb-3 text-xs text-ink/75">
                {minor ? t("auth.guardianRequiredNote") : t("auth.guardianOptionalNote")}
              </p>
              {field("guardianEmail", "auth.guardianEmail", "email", "off")}
              {minor && (
                <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1 accent-[var(--color-teal-deep)]"
                    data-testid="guardian-consent"
                  />
                  <span>{t("auth.consent")}</span>
                </label>
              )}
              {err("consent")}
            </fieldset>
          </>
        )}

        {!isStudent && (
          <p className="rounded-xl bg-teal/10 p-3 text-xs text-ink/80">
            {t("auth.parentNote")} <strong>{t("auth.parentInvited")}</strong>
          </p>
        )}

        <p className="flex gap-2 text-xs text-slate-deep">
          <ShieldCheck className="size-4 shrink-0 text-teal-deep" aria-hidden="true" />
          {t("auth.privacyNote")}
        </p>

        {serverError && (
          <p role="alert" className="text-sm text-terracotta-deep" data-testid="register-error">
            {serverError}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={busy} data-testid="register-submit">
          {busy && <Loader2 className="animate-spin" />}{" "}
          {isStudent ? t("auth.createStudent") : t("auth.createParent")}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-deep">
        {t("auth.already")}{" "}
        <Link to="/login" className="font-medium text-teal-deep hover:underline">
          {t("auth.signInBtn")}
        </Link>
      </p>
    </AuthShell>
  );
}
