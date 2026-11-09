import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import { supabase, requireSupabase } from "@/services/supabase/client";
import { data } from "@/services/data";
import { api } from "@/services/api";
import type { AccountType, AgeBand, Profile } from "@/types";

export interface SignUpInput {
  accountType: AccountType;
  displayName: string;
  email: string;
  password: string;
  /** students only */
  ageBand?: AgeBand;
  guardianConsent?: boolean;
  guardianEmail?: string;
  preferredLanguage: "auto" | "en" | "fr" | "ar";
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  initialized: boolean;
  init: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<{ needsConfirmation: boolean }>;
  /** scope "global" revokes every refresh token of the account (all devices). */
  signOut: (scope?: "local" | "global") => Promise<void>;
}

const FRIENDLY: Record<string, string> = {
  "Invalid login credentials": "Wrong email or password.",
  "Email not confirmed": "Please confirm your email first. Check your inbox (or ask a parent to).",
};

function friendly(message: string): string {
  if (message.includes("guardian_consent_required"))
    return "A parent or guardian must agree before a student under 18 can join.";
  if (message.includes("invalid_display_name"))
    return "Please choose a nickname between 2 and 40 characters.";
  if (message.includes("guardian_email_required"))
    return "Students under 18 must give a parent or guardian email.";
  if (message.includes("guardian_email_must_differ"))
    return "The parent email must be different from the student email.";
  if (message.includes("invalid_guardian_email")) return "The parent email address is not valid.";
  if (message.includes("Database error saving new user"))
    return "Your account could not be created. Check the form and try again.";
  return FRIENDLY[message] ?? message;
}

let listening = false;
const invitesSent = new Set<string>();

export const useAuth = create<AuthState>()((set, get) => ({
  user: null,
  profile: null,
  initialized: false,

  async init() {
    if (!supabase) return set({ initialized: true });
    // Invitation / recovery links (sent by the server via auth.admin) return tokens in the URL hash
    // (implicit flow), which the PKCE client does not pick up on its own. Verify and adopt them,
    // then remove them from the address bar and history.
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (
      hash.get("access_token") &&
      hash.get("refresh_token") &&
      ["invite", "recovery"].includes(hash.get("type") ?? "")
    ) {
      await supabase.auth.setSession({
        access_token: hash.get("access_token")!,
        refresh_token: hash.get("refresh_token")!,
      });
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    const { data: s } = await supabase.auth.getSession();
    set({ user: s.session?.user ?? null });
    if (s.session?.user)
      await get()
        .refreshProfile()
        .catch(() => undefined);
    if (!listening) {
      listening = true;
      supabase.auth.onAuthStateChange((_event, session) => {
        const prev = get().user?.id;
        set({ user: session?.user ?? null });
        if (!session?.user) set({ profile: null });
        else if (session.user.id !== prev)
          void get()
            .refreshProfile()
            .catch(() => undefined);
      });
    }
    set({ initialized: true });
  },

  async refreshProfile() {
    const user = get().user;
    if (!user) return;
    const profile = await data.profile(user.id);
    set({ profile });
    // students: (re)send pending guardian invitations; the server enforces cooldowns and limits
    if (profile.account_type === "student" && !invitesSent.has(user.id)) {
      invitesSent.add(user.id);
      void api.inviteGuardians().catch(() => undefined);
    }
    // parents: attach any child who named this (confirmed) email
    if (profile.account_type === "parent") await data.claimGuardianLinks().catch(() => undefined);
  },

  async signIn(email, password) {
    const sb = requireSupabase();
    const { data: d, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(friendly(error.message));
    set({ user: d.user });
    await get().refreshProfile();
  },

  async signUp(input) {
    const sb = requireSupabase();
    const { data: d, error } = await sb.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: `${window.location.origin}/login?confirmed=1`,
        data:
          input.accountType === "parent"
            ? {
                account_type: "parent",
                display_name: input.displayName,
                preferred_language: input.preferredLanguage,
              }
            : {
                account_type: "student",
                display_name: input.displayName,
                age_band: input.ageBand,
                guardian_consent: input.guardianConsent ?? false,
                guardian_email: input.guardianEmail?.trim() || undefined,
                preferred_language: input.preferredLanguage,
              },
      },
    });
    if (error) throw new Error(friendly(error.message));
    if (d.session?.user) {
      set({ user: d.session.user });
      await get().refreshProfile();
      return { needsConfirmation: false };
    }
    return { needsConfirmation: true };
  },

  async signOut(scope = "local") {
    if (supabase) await supabase.auth.signOut({ scope });
    set({ user: null, profile: null });
  },
}));
