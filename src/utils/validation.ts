import type { AgeBand } from "@/types";

export function validateEmail(email: string): string | null {
  if (!email.trim()) return "Please enter an email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()))
    return "Please enter a valid email address.";
  return null;
}

/** Mirrors the server policy in supabase/config.toml (min 10, lower + upper + digit). */
export function validatePassword(pw: string): string | null {
  if (pw.length < 10) return "Use at least 10 characters.";
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/\d/.test(pw)) {
    return "Use upper-case and lower-case letters and at least one number.";
  }
  return null;
}

export type RegistrationField =
  "name" | "email" | "password" | "confirm" | "ageBand" | "consent" | "guardianEmail";
export type RegistrationErrors = Partial<Record<RegistrationField, string>>;

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
    errors.name = "Choose a nickname between 2 and 40 characters.";
  else if (/@|\d{6,}/.test(nick))
    errors.name = "Please don't put an email or phone number in your nickname.";
  const email = validateEmail(f.email);
  if (email) errors.email = email;
  const pw = validatePassword(f.password);
  if (pw) errors.password = pw;
  if (f.confirm !== f.password) errors.confirm = "Passwords do not match.";
  if (f.accountType === "parent") return errors;
  if (!f.ageBand) errors.ageBand = "Please choose an age group.";
  else if (f.ageBand !== "18_plus" && !f.consent)
    errors.consent = "A parent or guardian must agree for students under 18.";
  const g = (f.guardianEmail ?? "").trim();
  if (f.ageBand && f.ageBand !== "18_plus" && !g) {
    errors.guardianEmail = "Students under 18 must give a parent or guardian email.";
  } else if (g && validateEmail(g)) {
    errors.guardianEmail = "Please enter a valid email address for your parent.";
  } else if (g && g.toLowerCase() === f.email.trim().toLowerCase()) {
    errors.guardianEmail = "Your parent email must be different from yours.";
  }
  return errors;
}
