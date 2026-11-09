import { useState } from "react";
import { useMentorLocalizer } from "@/data/mentorText";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { MENTORS, mentorStyle, type MentorProfile } from "@/data/mentors";
import { MentorCharacter } from "@/components/mentors/MentorPortrait";
import { Button } from "@/components/ui/button";
import { Card, Input, ProgressBar } from "@/components/ui/primitives";
import { ChipGroup, RadioCards, Toggle } from "@/components/ui/controls";
import { UI_LANGUAGES } from "@/i18n/languages";
import { useAuth } from "@/store/authStore";
import { effectiveReplyLanguage, usePrefs, type UiLanguage } from "@/store/prefsStore";
import { data } from "@/services/data";
import { learn } from "@/services/learn";
import { useErrorMessage, useT } from "@/i18n/strings";
import { QuizRunner } from "@/features/learning/modules/QuizModule";
import { ErrorState, WorkingState } from "@/features/learning/ui";
import type { LearningStyle, Profile } from "@/types";
import type { LearningItem } from "@/types/learning";
import { LEVELS, STYLES } from "@/data/preferences";
import { cn } from "@/lib/utils";

const TOTAL = 6;

export function OnboardingPage() {
  const t = useT();
  const L = useMentorLocalizer();
  const navigate = useNavigate();
  const errorMessage = useErrorMessage();
  const { user, profile, refreshProfile } = useAuth();
  const { uiLanguage, setUiLanguage, a11y, setA11y } = usePrefs();
  const replyLanguage = usePrefs((s) => effectiveReplyLanguage(s));

  const [step, setStep] = useState(1);
  const [nicknameEdit, setNickname] = useState<string | null>(null);
  const nickname = nicknameEdit ?? profile?.display_name ?? "";
  const [level, setLevel] = useState<Profile["level"]>(profile?.level ?? "intermediate");
  const [styles, setStyles] = useState<LearningStyle[]>(profile?.learning_styles ?? []);
  const [diagMentor, setDiagMentor] = useState<MentorProfile | null>(null);
  const [diagItem, setDiagItem] = useState<LearningItem<"diagnostic"> | null>(null);
  const [diagBusy, setDiagBusy] = useState(false);
  const [suggested, setSuggested] = useState<Profile["level"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const nicknameOk = nickname.trim().length >= 2 && nickname.trim().length <= 40 && !/@|\d{6,}/.test(nickname);

  async function startDiagnostic(m: MentorProfile) {
    setDiagMentor(m);
    setDiagBusy(true);
    setError(null);
    try {
      const { item } = await learn.generate({ mentorId: m.id, kind: "diagnostic", topic: L(m).topics[0], language: replyLanguage });
      setDiagItem(item as LearningItem<"diagnostic">);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDiagBusy(false);
    }
  }

  async function finish() {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await data.updateProfile(user.id, {
        display_name: nickname.trim(),
        preferred_language: uiLanguage,
        level,
        learning_styles: styles,
        accessibility: { ...a11y },
        onboarded_at: new Date().toISOString(),
      });
      await refreshProfile();
      navigate("/dashboard", { replace: true });
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  const canNext = step !== 1 || nicknameOk;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-end gap-4">
        <div className="flex -space-x-6" aria-hidden="true">
          {MENTORS.map((m) => (
            <div key={m.id} className="w-16 sm:w-20">
              <MentorCharacter mentor={m} state={step === TOTAL ? "talking" : "idle"} frame={false} decorative />
            </div>
          ))}
        </div>
        <div>
          <h1 className="font-display text-3xl sm:text-4xl">{t("onb.title")}</h1>
          <p className="text-sm text-slate-deep">{t("onb.step", { n: step, total: TOTAL })}</p>
        </div>
      </div>
      <ProgressBar value={(step / TOTAL) * 100} className="mt-4" />

      <Card className="mt-6 p-6" data-testid={`onboarding-step-${step}`}>
        {step === 1 && (
          <div>
            <label htmlFor="nick" className="font-display text-2xl">
              {t("onb.nickname")}
            </label>
            <p className="mt-1 text-sm text-slate-deep">{t("onb.nicknameHelp")}</p>
            <Input id="nick" data-testid="onboarding-nickname" value={nickname} maxLength={40} onChange={(e) => setNickname(e.target.value)} className="mt-3 h-12 text-base" dir="auto" autoComplete="nickname" />
          </div>
        )}
        {step === 2 && (
          <RadioCards<UiLanguage>
            label={t("onb.language")}
            value={uiLanguage}
            onChange={setUiLanguage}
            options={UI_LANGUAGES.map((l) => ({ value: l.value, label: l.label }))}
          />
        )}
        {step === 3 && <RadioCards label={t("onb.level")} value={level} onChange={setLevel} options={LEVELS.map((l) => ({ value: l, label: t(`level.${l}`) }))} />}
        {step === 4 && (
          <ChipGroup label={t("onb.styles")} help={t("onb.stylesHelp")} options={STYLES.map((s) => ({ value: s, label: t(`style.${s}`) }))} value={styles} onChange={setStyles} />
        )}
        {step === 5 && (
          <div>
            <h2 className="font-display text-2xl">{t("onb.access")}</h2>
            <div className="mt-2 divide-y divide-ink/10">
              <Toggle label={t("set.size.lg")} description={t("set.textSize")} checked={a11y.textSize !== "md"} onChange={(v) => setA11y({ textSize: v ? "lg" : "md" })} />
              <Toggle label={t("set.highContrast")} description={t("set.highContrastDesc")} checked={a11y.highContrast} onChange={(v) => setA11y({ highContrast: v })} />
              <Toggle label={t("set.simplified")} description={t("set.simplifiedDesc")} checked={a11y.simplified} onChange={(v) => setA11y({ simplified: v })} />
              <Toggle label={t("set.reducedMotion")} description={t("set.reducedMotionDesc")} checked={a11y.reducedMotion} onChange={(v) => setA11y({ reducedMotion: v })} />
              <Toggle label={t("set.focusMode")} description={t("set.focusModeDesc")} checked={a11y.focusMode} onChange={(v) => setA11y({ focusMode: v })} />
              <Toggle label={t("set.spacing")} description={t("set.spacingDesc")} checked={a11y.spacing === "wide"} onChange={(v) => setA11y({ spacing: v ? "wide" : "normal" })} />
            </div>
          </div>
        )}
        {step === 6 && (
          <div>
            <h2 className="font-display text-2xl">{t("onb.diagnostic")}</h2>
            <p className="mt-1 text-sm text-slate-deep">{t("onb.diagnosticHelp")}</p>
            {error && <div className="mt-3"><ErrorState message={error} onRetry={diagMentor ? () => void startDiagnostic(diagMentor) : undefined} /></div>}
            {!diagMentor && (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {MENTORS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => void startDiagnostic(m)}
                    style={mentorStyle(m)}
                    className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-ink/10 bg-paper p-4 hover:border-[var(--mentor)]"
                    data-testid={`diag-${m.id}`}
                  >
                    <div className="w-24">
                      <MentorCharacter mentor={m} frame={false} decorative />
                    </div>
                    <span className="text-center text-sm font-medium">{t("onb.diagnosticStart", { name: m.name })}</span>
                    <span className="text-xs text-slate-deep">{L(m).shortDomain}</span>
                  </button>
                ))}
              </div>
            )}
            {diagMentor && diagBusy && (
              <div className="mt-4" style={mentorStyle(diagMentor)}>
                <WorkingState mentor={diagMentor} label={t("act.generating", { name: diagMentor.name })} />
              </div>
            )}
            {diagMentor && diagItem && (
              <div className="mt-4" style={mentorStyle(diagMentor)}>
                <QuizRunner
                  item={diagItem}
                  onFinished={(correct, total) => {
                    const ratio = correct / total;
                    setSuggested(ratio >= 0.75 ? "advanced" : ratio >= 0.4 ? "intermediate" : "beginner");
                  }}
                />
                {suggested && (
                  <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-teal/10 p-4" role="status">
                    <p className="font-medium">{t("onb.diagnosticResult", { level: t(`level.${suggested}`) })}</p>
                    <Button size="sm" variant="outline" onClick={() => setLevel(suggested)} disabled={level === suggested}>
                      {t("common.save")}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {error && step !== 6 && <div className="mt-4"><ErrorState message={error} /></div>}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
          <ArrowLeft className="rtl:-scale-x-100" /> {t("common.back")}
        </Button>
        {step < TOTAL ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext} data-testid="onboarding-next">
            {t("common.next")} <ArrowRight className="rtl:-scale-x-100" />
          </Button>
        ) : (
          <Button variant="gold" size="lg" onClick={() => void finish()} disabled={saving || !nicknameOk} data-testid="onboarding-finish" className={cn(saving && "opacity-80")}>
            {saving && <Loader2 className="animate-spin" />}
            {diagItem || suggested ? t("onb.finish") : `${t("common.skip")} · ${t("onb.finish")}`}
          </Button>
        )}
      </div>
    </div>
  );
}
