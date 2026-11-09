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

const AGE_BANDS: { value: AgeBand; label: string }[] = [
  { value: "under_13", label: "Under 13" },
  { value: "13_15", label: "13 – 15" },
  { value: "16_17", label: "16 – 17" },
  { value: "18_plus", label: "18 or older" },
];

export function RegisterPage() {
  const signUp = useAuth((s) => s.signUp);
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
      setServerError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setBusy(false);
    }
  }

  const err = (k: RegistrationField) =>
    errors[k] ? (
      <p id={`${k}-error`} className="mt-1 text-xs text-terracotta-deep">
        {errors[k]}
      </p>
    ) : null;

  const field = (
    k: "name" | "email" | "password" | "confirm" | "guardianEmail",
    label: string,
    type: string,
    autoComplete: string,
    hint?: string,
  ) => (
    <div>
      <Label htmlFor={k}>{label}</Label>
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
      {hint && !errors[k] && <p className="mt-1 text-xs text-slate-deep">{hint}</p>}
      {err(k)}
    </div>
  );

  if (confirmSent) {
    return (
      <AuthShell title="Check your inbox" subtitle="One last step.">
        <Alert tone="teal">
          <MailCheck className="mt-0.5 size-4 shrink-0 text-teal-deep" />
          <span data-testid="confirm-sent">
            We sent a confirmation link to <strong>{form.email}</strong>. Open it to activate the
            account, then sign in.
            {isStudent && form.guardianEmail && (
              <>
                {" "}
                Once you sign in, we'll invite your parent at <strong>
                  {form.guardianEmail}
                </strong>{" "}
                to follow your progress.
              </>
            )}
          </span>
        </Alert>
        <Button asChild variant="outline" className="mt-6 w-full">
          <Link to="/login">Go to sign in</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Join the academy" subtitle="Create a student or a parent account.">
      <div className="mb-5 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Account type">
        {(
          [
            { value: "student", label: "I'm a student", icon: GraduationCap },
            { value: "parent", label: "I'm a parent", icon: Users },
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
          isStudent ? "Nickname" : "Your name",
          "text",
          "nickname",
          isStudent ? "Use a nickname, not your full real name." : undefined,
        )}
        {field("email", "Email", "email", "email")}
        {field(
          "password",
          "Password",
          "password",
          "new-password",
          "At least 10 characters with upper-case, lower-case and a number.",
        )}
        {field("confirm", "Confirm password", "password", "new-password")}

        {isStudent && (
          <>
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium">Age group</legend>
              <div className="grid grid-cols-2 gap-2" role="radiogroup">
                {AGE_BANDS.map((b) => (
                  <label
                    key={b.value}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-ink/15 bg-paper px-3 py-2 text-sm has-[:checked]:border-teal-deep has-[:checked]:bg-teal/10"
                  >
                    <input
                      type="radio"
                      name="age"
                      value={b.value}
                      checked={ageBand === b.value}
                      onChange={() => setAgeBand(b.value)}
                      className="accent-[var(--color-teal-deep)]"
                    />
                    {b.label}
                  </label>
                ))}
              </div>
              {err("ageBand")}
            </fieldset>

            <fieldset
              className="rounded-xl border border-gold/50 bg-gold/10 p-3"
              data-testid="parent-section"
            >
              <legend className="px-1 text-sm font-semibold">Parent or guardian</legend>
              <p className="mb-3 text-xs text-ink/75">
                {minor
                  ? "Required for students under 18. Your parent receives an invitation to a parent dashboard where they can follow your progress (not your chats)."
                  : "Optional. Add a parent's email if you want them to follow your progress."}
              </p>
              {field("guardianEmail", "Parent's email", "email", "off")}
              {minor && (
                <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1 accent-[var(--color-teal-deep)]"
                    data-testid="guardian-consent"
                  />
                  <span>My parent or guardian agrees to me using Qarrai Academy's AI mentors.</span>
                </label>
              )}
              {err("consent")}
            </fieldset>
          </>
        )}

        {!isStudent && (
          <p className="rounded-xl bg-teal/10 p-3 text-xs text-ink/80">
            Use the same email your child entered as their parent's email. Once you confirm it, your
            child's progress appears on your dashboard automatically.{" "}
            <strong>Already received an invitation email from Qarrai?</strong> Open its link instead
            to choose your password.
          </p>
        )}

        <p className="flex gap-2 text-xs text-slate-deep">
          <ShieldCheck className="size-4 shrink-0 text-teal-deep" aria-hidden="true" />
          We store only a nickname, an age group and learning activity. Emails and phone numbers
          typed in chats are removed automatically. You can export or delete everything at any time
          from the account page.
        </p>

        {serverError && (
          <p role="alert" className="text-sm text-terracotta-deep" data-testid="register-error">
            {serverError}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={busy} data-testid="register-submit">
          {busy && <Loader2 className="animate-spin" />} Create {isStudent ? "student" : "parent"}{" "}
          account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-deep">
        Already registered?{" "}
        <Link to="/login" className="font-medium text-teal-deep hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
