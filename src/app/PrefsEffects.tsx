import { useEffect, useRef, useState } from "react";
import { Coffee } from "lucide-react";
import { useAuth } from "@/store/authStore";
import { applyAccessibility, applyDocumentLanguage, usePrefs } from "@/store/prefsStore";
import { data } from "@/services/data";
import { useT } from "@/i18n/strings";
import { Button } from "@/components/ui/button";

/** Applies language & accessibility to the document and saves changes to the learner's profile. */
export function PrefsEffects() {
  const uiLanguage = usePrefs((s) => s.uiLanguage);
  const a11y = usePrefs((s) => s.a11y);
  const pendingSync = usePrefs((s) => s.pendingSync);
  const markSynced = usePrefs((s) => s.markSynced);
  const user = useAuth((s) => s.user);
  const profile = useAuth((s) => s.profile);
  const lastSaved = useRef<string | null>(null);

  useEffect(() => applyDocumentLanguage(uiLanguage), [uiLanguage]);
  useEffect(() => applyAccessibility(a11y), [a11y]);

  // debounced save to profiles (language + accessibility), only when something changed
  useEffect(() => {
    if (!user || !profile) return;
    const payload = JSON.stringify({ l: uiLanguage, a: a11y });
    if (lastSaved.current === null && !pendingSync) {
      lastSaved.current = JSON.stringify({ l: profile.preferred_language === "auto" ? uiLanguage : profile.preferred_language, a: a11y });
    }
    if (payload === lastSaved.current) return;
    const id = window.setTimeout(() => {
      data
        .updateProfile(user.id, { preferred_language: uiLanguage, accessibility: { ...a11y } })
        .then(() => {
          lastSaved.current = payload;
          if (JSON.stringify({ l: usePrefs.getState().uiLanguage, a: usePrefs.getState().a11y }) === payload) markSynced();
        })
        .catch(() => undefined); // non-blocking: settings still apply locally
    }, 800);
    return () => window.clearTimeout(id);
  }, [user, profile, uiLanguage, a11y, pendingSync, markSynced]);

  return <BreakReminder />;
}

const BREAK_AFTER_MS = 25 * 60 * 1000;

/** Optional, dismissible on-screen reminder (no sound, no notification permission needed). */
function BreakReminder() {
  const t = useT();
  const enabled = usePrefs((s) => s.a11y.breakReminders);
  const [due, setDue] = useState(false);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const id = window.setTimeout(() => setDue(true), BREAK_AFTER_MS);
    return () => window.clearTimeout(id);
  }, [enabled, cycle]);

  if (!enabled || !due) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-teal bg-paper p-4 shadow-[var(--shadow-card)]"
      data-testid="break-reminder"
    >
      <Coffee className="size-6 shrink-0 text-teal-deep" aria-hidden="true" />
      <p className="flex-1 text-sm">{t("set.breakNow")}</p>
      <Button
        size="sm"
        onClick={() => {
          setDue(false);
          setCycle((c) => c + 1);
        }}
      >
        {t("set.dismiss")}
      </Button>
    </div>
  );
}
