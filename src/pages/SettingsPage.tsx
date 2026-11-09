import { useState } from "react";
import { Accessibility, BookOpen, CheckCircle2, Languages, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Textarea } from "@/components/ui/primitives";
import { ChipGroup, RadioCards, Toggle } from "@/components/ui/controls";
import { UI_LANGUAGES } from "@/i18n/languages";
import { useAuth } from "@/store/authStore";
import { usePrefs, type UiLanguage } from "@/store/prefsStore";
import { data } from "@/services/data";
import { useErrorMessage, useT } from "@/i18n/strings";
import { LEVELS, STYLES } from "@/data/preferences";
import type { Language, LearningStyle, Profile } from "@/types";


export function SettingsPage() {
  const t = useT();
  const { profile } = useAuth();
  const { uiLanguage, setUiLanguage, replyLanguage, setReplyLanguage, a11y, setA11y } = usePrefs();
  const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-4xl">{t("set.title")}</h1>
      <p className="mt-1 text-slate-deep">{t("set.intro")}</p>

      {profile?.account_type === "student" && <LearningSettings key={profile.id} />}

      <Card className="mt-6 p-6">
        <h2 className="flex items-center gap-2 font-display text-2xl">
          <Languages className="size-5 text-teal-deep" aria-hidden="true" /> {t("set.language")}
        </h2>
        <div className="mt-4 space-y-4">
          <RadioCards<UiLanguage>
            label={t("set.uiLanguage")}
            value={uiLanguage}
            onChange={setUiLanguage}
            options={UI_LANGUAGES.map((l) => ({ value: l.value, label: l.label }))}
          />
          <div>
            <label htmlFor="reply-lang" className="font-medium">
              {t("set.replyLanguage")}
            </label>
            <select
              id="reply-lang"
              value={replyLanguage}
              onChange={(e) => setReplyLanguage(e.target.value as Language)}
              className="mt-1 block h-11 w-full rounded-xl border border-ink/15 bg-paper px-3"
            >
              <option value="auto">{t("set.replySame")}</option>
              {UI_LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="flex items-center gap-2 font-display text-2xl">
          <Accessibility className="size-5 text-teal-deep" aria-hidden="true" /> {t("set.reading")}
        </h2>
        <div className="mt-4">
          <RadioCards
            label={t("set.textSize")}
            value={a11y.textSize}
            onChange={(v) => setA11y({ textSize: v })}
            options={[
              { value: "md", label: t("set.size.md") },
              { value: "lg", label: t("set.size.lg") },
              { value: "xl", label: t("set.size.xl") },
            ]}
          />
        </div>
        <div className="mt-2 divide-y divide-ink/10">
          <Toggle label={t("set.highContrast")} description={t("set.highContrastDesc")} checked={a11y.highContrast} onChange={(v) => setA11y({ highContrast: v })} testId="toggle-contrast" />
          <Toggle label={t("set.spacing")} description={t("set.spacingDesc")} checked={a11y.spacing === "wide"} onChange={(v) => setA11y({ spacing: v ? "wide" : "normal" })} />
          <Toggle label={t("set.simplified")} description={t("set.simplifiedDesc")} checked={a11y.simplified} onChange={(v) => setA11y({ simplified: v })} />
          <Toggle
            label={t("set.readAloud")}
            description={speechSupported ? t("set.readAloudDesc") : t("set.readAloudUnsupported")}
            checked={a11y.readAloud && speechSupported}
            disabled={!speechSupported}
            onChange={(v) => setA11y({ readAloud: v })}
          />
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="flex items-center gap-2 font-display text-2xl">
          <Sparkles className="size-5 text-teal-deep" aria-hidden="true" /> {t("set.focusTitle")}
        </h2>
        <div className="mt-2 divide-y divide-ink/10">
          <Toggle label={t("set.reducedMotion")} description={t("set.reducedMotionDesc")} checked={a11y.reducedMotion} onChange={(v) => setA11y({ reducedMotion: v })} testId="toggle-motion" />
          <Toggle label={t("set.focusMode")} description={t("set.focusModeDesc")} checked={a11y.focusMode} onChange={(v) => setA11y({ focusMode: v })} testId="toggle-focus" />
          <Toggle label={t("set.breaks")} description={t("set.breaksDesc")} checked={a11y.breakReminders} onChange={(v) => setA11y({ breakReminders: v })} />
          <Toggle label={t("set.sounds")} description={t("set.soundsDesc")} checked={a11y.sounds} onChange={(v) => setA11y({ sounds: v })} />
        </div>
      </Card>
    </div>
  );
}

function LearningSettings() {
  const t = useT();
  const errorMessage = useErrorMessage();
  const { user, profile, refreshProfile } = useAuth();
  const [level, setLevel] = useState<Profile["level"]>(profile?.level ?? "intermediate");
  const [styles, setStyles] = useState<LearningStyle[]>(profile?.learning_styles ?? []);
  const [goals, setGoals] = useState(profile?.goals ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | string>("idle");

  async function save() {
    if (!user) return;
    setStatus("saving");
    try {
      await data.updateProfile(user.id, { level, learning_styles: styles, goals: goals.trim() || null });
      await refreshProfile();
      setStatus("saved");
    } catch (e) {
      setStatus(errorMessage(e));
    }
  }

  return (
    <Card className="mt-6 p-6">
      <h2 className="flex items-center gap-2 font-display text-2xl">
        <BookOpen className="size-5 text-teal-deep" aria-hidden="true" /> {t("set.learning")}
      </h2>
      <div className="mt-4 space-y-5">
        <RadioCards label={t("set.level")} value={level} onChange={setLevel} options={LEVELS.map((l) => ({ value: l, label: t(`level.${l}`) }))} />
        <ChipGroup label={t("set.styles")} help={t("onb.stylesHelp")} options={STYLES.map((s) => ({ value: s, label: t(`style.${s}`) }))} value={styles} onChange={setStyles} />
        <div>
          <label htmlFor="goals" className="font-medium">
            {t("set.goals")} <span className="text-sm font-normal text-slate-deep">({t("common.optional")})</span>
          </label>
          <Textarea id="goals" rows={2} maxLength={300} value={goals} onChange={(e) => setGoals(e.target.value)} placeholder={t("set.goalsPlaceholder")} className="mt-1" dir="auto" />
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => void save()} disabled={status === "saving"} data-testid="save-learning">
            {status === "saving" && <Loader2 className="animate-spin" />} {t("common.save")}
          </Button>
          {status === "saved" && (
            <span role="status" className="flex items-center gap-1 text-sm text-teal-deep">
              <CheckCircle2 className="size-4" aria-hidden="true" /> {t("common.saved")}
            </span>
          )}
          {status !== "idle" && status !== "saving" && status !== "saved" && (
            <span role="alert" className="text-sm text-terracotta-deep">
              {status}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
