import type { AgeBand } from "@/types";
import type { StringKey } from "@/i18n/strings";

/** Validators return translation keys; pages render them with t(). */

export function validateEmail(email: string): StringKey | null {
  if (!email.trim()) return "val.emailEmpty";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()))
    return "val.emailInvalid";
  return null;
}

/** Mirrors the server policy in supabase/config.toml (min 10, lower + upper + digit). */
export function validatePassword(pw: string): StringKey | null {
  if (pw.length < 10) return "val.pwLength";
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/\d/.test(pw)) {
    return "val.pwMix";
  }
  return null;
}

export type RegistrationField =
  "name" | "email" | "password" | "confirm" | "ageBand" | "consent" | "guardianEmail";
export type RegistrationErrors = Partial<Record<RegistrationField, StringKey>>;

export function validateRegistration(f: {
  accountType?: "student" | "parent";
  guardianEmail?: string;
  name: string;
  email: string;
  password: string;
  confirm: string;
  ageBand: AgeBand | "";
  consent: boolean;
}): RegistrationErrors {
  const errors: RegistrationErrors = {};
  const nick = f.name.trim();
  if (nick.length < 2 || nick.length > 40)
    errors.name = "val.nickLength";
  else if (/@|\d{6,}/.test(nick))
    errors.name = "val.nickPersonal";
  const email = validateEmail(f.email);
  if (email) errors.email = email;
  const pw = validatePassword(f.password);
  if (pw) errors.password = pw;
  if (f.confirm !== f.password) errors.confirm = "val.pwMismatch";
  if (f.accountType === "parent") return errors;
  if (!f.ageBand) errors.ageBand = "val.ageRequired";
  else if (f.ageBand !== "18_plus" && !f.consent)
    errors.consent = "val.consentRequired";
  const g = (f.guardianEmail ?? "").trim();
  if (f.ageBand && f.ageBand !== "18_plus" && !g) {
    errors.guardianEmail = "val.guardianRequired";
  } else if (g && validateEmail(g)) {
    errors.guardianEmail = "val.guardianInvalid";
  } else if (g && g.toLowerCase() === f.email.trim().toLowerCase()) {
    errors.guardianEmail = "val.guardianDifferent";
  }
  return errors;
}
