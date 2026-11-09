import { Languages } from "lucide-react";
import { usePrefs, type UiLanguage } from "@/store/prefsStore";
import { useT } from "@/i18n/strings";
import { cn } from "@/lib/utils";

const OPTIONS: { value: UiLanguage; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "fr", label: "FR" },
  { value: "ar", label: "ع" },
];

export function LanguageSwitcher({ className }: { className?: string }) {
  const { uiLanguage, setUiLanguage } = usePrefs();
  const t = useT();
  return (
    <div
      className={cn("flex items-center gap-1", className)}
      role="group"
      aria-label={t("common.language")}
    >
      <Languages className="size-4 text-slate-deep" aria-hidden="true" />
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => setUiLanguage(o.value)}
          aria-pressed={uiLanguage === o.value}
          className={cn(
            "h-7 min-w-7 cursor-pointer rounded-full px-2 text-xs font-semibold transition-colors",
            uiLanguage === o.value ? "bg-ink text-parchment" : "text-slate-deep hover:bg-ink/5",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
