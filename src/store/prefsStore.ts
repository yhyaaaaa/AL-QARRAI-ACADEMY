import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Language } from "@/types";

export type UiLanguage = "en" | "fr" | "ar";

interface PrefsState {
  uiLanguage: UiLanguage;
  /** language the mentors answer in ("auto" = mirror the student) */
  tutorLanguage: Language;
  setUiLanguage: (l: UiLanguage) => void;
  setTutorLanguage: (l: Language) => void;
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      uiLanguage: "en",
      tutorLanguage: "auto",
      setUiLanguage: (uiLanguage) => set({ uiLanguage }),
      setTutorLanguage: (tutorLanguage) => set({ tutorLanguage }),
    }),
    { name: "qarrai-prefs-v1" },
  ),
);

export function applyDocumentLanguage(lang: UiLanguage) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
}
