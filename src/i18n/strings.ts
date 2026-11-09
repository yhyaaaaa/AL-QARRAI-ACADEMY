import { usePrefs, type UiLanguage } from "@/store/prefsStore";

/**
 * Lightweight i18n for the interface chrome (navigation, key labels).
 * MVP scope: navigation and core labels are translated in EN/FR/AR with RTL layout;
 * long-form page copy is English for now (see docs/TECHNICAL_REPORT.md §16).
 */
const STRINGS = {
  "nav.dashboard": { en: "Dashboard", fr: "Tableau de bord", ar: "لوحة التحكم" },
  "nav.mentors": { en: "Mentors", fr: "Mentors", ar: "المرشدون" },
  "nav.learn": { en: "Learning space", fr: "Espace d'étude", ar: "فضاء التعلّم" },
  "nav.progress": { en: "Progress", fr: "Progression", ar: "التقدّم" },
  "nav.parent": { en: "My children", fr: "Mes enfants", ar: "أبنائي" },
  "nav.signOut": { en: "Sign out", fr: "Se déconnecter", ar: "تسجيل الخروج" },
  "nav.signIn": { en: "Sign in", fr: "Se connecter", ar: "تسجيل الدخول" },
  "nav.start": { en: "Enter the academy", fr: "Entrer à l'académie", ar: "ادخل الأكاديمية" },
  "common.language": { en: "Language", fr: "Langue", ar: "اللغة" },
  "chat.placeholder": {
    en: "Ask your mentor anything…",
    fr: "Pose ta question à ton mentor…",
    ar: "اطرح سؤالك على مرشدك…",
  },
  "chat.send": { en: "Send", fr: "Envoyer", ar: "إرسال" },
  "chat.exercise": { en: "Practice exercise", fr: "Exercice", ar: "تمرين" },
  "chat.attach": { en: "Attach material", fr: "Joindre un document", ar: "إرفاق مادة" },
  "chat.newSession": { en: "New session", fr: "Nouvelle séance", ar: "جلسة جديدة" },
  "dash.welcome": { en: "Welcome back", fr: "Bon retour", ar: "مرحبًا بعودتك" },
} satisfies Record<string, Record<UiLanguage, string>>;

export type StringKey = keyof typeof STRINGS;

export function translate(key: StringKey, lang: UiLanguage): string {
  return STRINGS[key][lang] ?? STRINGS[key].en;
}

export function useT() {
  const lang = usePrefs((s) => s.uiLanguage);
  return (key: StringKey) => translate(key, lang);
}
