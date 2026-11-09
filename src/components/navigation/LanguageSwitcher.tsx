import { useId } from "react";
import { Languages } from "lucide-react";
import { usePrefs, type UiLanguage } from "@/store/prefsStore";
import { useT } from "@/i18n/strings";
import { cn } from "@/lib/utils";
import { UI_LANGUAGES } from "@/i18n/languages";


/**
 * Switches the interface language instantly (layout flips to RTL for Arabic and Darija).
 * The current page, topic and conversation are kept.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { uiLanguage, setUiLanguage } = usePrefs();
  const t = useT();
  const id = useId();
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Languages className="size-4 text-slate-deep" aria-hidden="true" />
      <label htmlFor={id} className="sr-only">
        {t("lang.label")}
      </label>
      <select
        id={id}
        value={uiLanguage}
        onChange={(e) => setUiLanguage(e.target.value as UiLanguage)}
        className="h-9 cursor-pointer rounded-full border border-ink/15 bg-paper px-3 text-sm font-medium"
        data-testid="language-select"
      >
        {UI_LANGUAGES.map((l) => (
          <option key={l.value} value={l.value} lang={l.value === "tn" ? "ar-TN" : l.value}>
            {l.label}
          </option>
        ))}
      </select>
    </div>
  );
}
