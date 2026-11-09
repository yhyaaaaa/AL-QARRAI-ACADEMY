import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Language } from "@/types";

export type UiLanguage = "en" | "fr" | "ar" | "tn";

/** Explicitly chosen comfort settings — never inferred. Stored locally and in profiles.accessibility. */
export interface AccessibilityPrefs {
  textSize: "md" | "lg" | "xl";
  highContrast: boolean;
  spacing: "normal" | "wide";
  reducedMotion: boolean;
  focusMode: boolean;
  readAloud: boolean;
  sounds: boolean;
  simplified: boolean;
  breakReminders: boolean;
}

export const DEFAULT_A11Y: AccessibilityPrefs = {
  textSize: "md",
  highContrast: false,
  spacing: "normal",
  reducedMotion: false,
  focusMode: false,
  readAloud: true,
  sounds: false,
  simplified: false,
  breakReminders: false,
};

interface PrefsState {
  uiLanguage: UiLanguage;
  /** "auto" = reply in the interface language */
  replyLanguage: Language;
  a11y: AccessibilityPrefs;
  /** local edits not yet saved to the profile: they win over the profile copy on reload */
  pendingSync: boolean;
  setUiLanguage: (l: UiLanguage) => void;
  setReplyLanguage: (l: Language) => void;
  setA11y: (patch: Partial<AccessibilityPrefs>) => void;
  /** adopt settings stored in the learner's profile (after sign-in) */
  hydrate: (p: { language?: string | null; accessibility?: Partial<AccessibilityPrefs> | null }) => void;
  markSynced: () => void;
}

export function sanitizeA11y(raw: unknown): AccessibilityPrefs {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const bool = (k: keyof AccessibilityPrefs) => (typeof r[k] === "boolean" ? (r[k] as boolean) : (DEFAULT_A11Y[k] as boolean));
  return {
    textSize: r.textSize === "lg" || r.textSize === "xl" ? r.textSize : "md",
    spacing: r.spacing === "wide" ? "wide" : "normal",
    highContrast: bool("highContrast"),
    reducedMotion: bool("reducedMotion"),
    focusMode: bool("focusMode"),
    readAloud: bool("readAloud"),
    sounds: bool("sounds"),
    simplified: bool("simplified"),
    breakReminders: bool("breakReminders"),
  };
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      uiLanguage: "en",
      replyLanguage: "auto",
      a11y: DEFAULT_A11Y,
      pendingSync: false,
      setUiLanguage: (uiLanguage) => set({ uiLanguage, pendingSync: true }),
      setReplyLanguage: (replyLanguage) => set({ replyLanguage }),
      setA11y: (patch) => set((s) => ({ a11y: sanitizeA11y({ ...s.a11y, ...patch }), pendingSync: true })),
      markSynced: () => set({ pendingSync: false }),
      hydrate: ({ language, accessibility }) =>
        set((s) => s.pendingSync ? s : ({
          uiLanguage: language === "en" || language === "fr" || language === "ar" || language === "tn" ? language : s.uiLanguage,
          a11y: accessibility ? sanitizeA11y({ ...s.a11y, ...accessibility }) : s.a11y,
        })),
    }),
    { name: "qarrai-prefs-v2" },
  ),
);

/** The language the AI should answer in. */
export function effectiveReplyLanguage(s: Pick<PrefsState, "uiLanguage" | "replyLanguage">): Language {
  return s.replyLanguage === "auto" ? s.uiLanguage : s.replyLanguage;
}

export function applyDocumentLanguage(lang: UiLanguage) {
  document.documentElement.lang = lang === "tn" ? "ar-TN" : lang;
  document.documentElement.dir = lang === "ar" || lang === "tn" ? "rtl" : "ltr";
}

/** Reflect accessibility settings as data attributes consumed by index.css. */
export function applyAccessibility(a: AccessibilityPrefs) {
  const el = document.documentElement;
  el.dataset.textSize = a.textSize;
  el.dataset.spacing = a.spacing;
  el.dataset.contrast = a.highContrast ? "high" : "normal";
  el.dataset.motion = a.reducedMotion ? "reduced" : "normal";
  el.dataset.focus = a.focusMode ? "on" : "off";
}
