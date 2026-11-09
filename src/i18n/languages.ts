import type { UiLanguage } from "@/store/prefsStore";

export const UI_LANGUAGES: { value: UiLanguage; label: string; short: string }[] = [
  { value: "en", label: "English", short: "EN" },
  { value: "fr", label: "Français", short: "FR" },
  { value: "ar", label: "العربية", short: "ع" },
  { value: "tn", label: "تونسي (دارجة)", short: "تونسي" },
];
