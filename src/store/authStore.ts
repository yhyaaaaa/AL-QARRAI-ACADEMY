import { create } from "zustand";
import type { StringKey } from "@/i18n/strings";
import type { User } from "@supabase/supabase-js";
import { supabase, requireSupabase } from "@/services/supabase/client";
import { data } from "@/services/data";
import { api } from "@/services/api";
import { usePrefs, type AccessibilityPrefs } from "@/store/prefsStore";
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
  preferredLanguage: "auto" | "en" | "fr" | "ar" | "tn";
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

/** Maps auth/server errors to translation keys (pages translate them with translateMessage). */
const FRIENDLY: Record<string, StringKey> = {
  "Invalid login credentials": "auth.err.credentials",
  "Email not confirmed": "auth.err.unconfirmed",
};

function friendly(message: string): string {
  if (message.includes("guardian_consent_required")) return "val.consentRequired";
  if (message.includes("invalid_display_name")) return "val.nickLength";
  if (message.includes("guardian_email_required")) return "val.guardianRequired";
  if (message.includes("guardian_email_must_differ")) return "val.guardianDifferent";
  if (message.includes("invalid_guardian_email")) return "val.guardianInvalid";
  if (message.includes("Database error saving new user")) return "auth.err.createFailed";
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
    // adopt the learner's saved language & comfort settings on this device
    usePrefs.getState().hydrate({
      language: profile.preferred_language === "auto" ? null : profile.preferred_language,
      accessibility: profile.accessibility as Partial<AccessibilityPrefs>,
    });
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
    // unsaved preferences belong to the account that made them, never to the next one
    usePrefs.getState().markSynced();
    set({ user: null, profile: null });
  },
}));
