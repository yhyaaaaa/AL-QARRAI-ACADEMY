import { useCallback, useEffect, useRef, useState } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { MentorState } from "@/data/mentors";
import type { MentorId } from "@/types";
import { usePrefs, type UiLanguage } from "@/store/prefsStore";

/** Current topic per mentor — survives language switches and navigation between modules. */
export const useTopicStore = create<{ topics: Partial<Record<MentorId, string>>; setTopic: (m: MentorId, t: string) => void }>()(
  persist(
    (set) => ({
      topics: {},
      setTopic: (m, t) => set((s) => ({ topics: { ...s.topics, [m]: t.slice(0, 200) } })),
    }),
    { name: "qarrai-topics", storage: createJSONStorage(() => sessionStorage) },
  ),
);

/**
 * Drives the character's four states from what is really happening:
 * typing → listening · waiting for the AI → thinking · new answer or reading aloud → talking.
 */
export function useCharacterState({ pending, typing, speaking }: { pending: boolean; typing: boolean; speaking?: boolean }) {
  const [recentlyAnswered, setRecentlyAnswered] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const answered = useCallback(() => {
    setRecentlyAnswered(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setRecentlyAnswered(false), 3500);
  }, []);
  let state: MentorState = "idle";
  if (pending) state = "thinking";
  else if (speaking || recentlyAnswered) state = "talking";
  else if (typing) state = "listening";
  return { state, answered };
}

const VOICE_LANG: Record<UiLanguage, string> = { en: "en", fr: "fr", ar: "ar", tn: "ar" };

function guessLang(text: string, fallback: UiLanguage): string {
  if (/[؀-ۿ]/.test(text)) return "ar";
  if (/[àâçéèêëîïôûùüœ]/i.test(text)) return "fr";
  return VOICE_LANG[fallback];
}

/** Text-to-speech with the browser's built-in voices (no audio is sent anywhere). */
export function useSpeech() {
  const uiLanguage = usePrefs((s) => s.uiLanguage);
  const enabled = usePrefs((s) => s.a11y.readAloud);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  useEffect(() => () => {
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  const speak = useCallback(
    (id: string, text: string) => {
      if (!supported) return;
      window.speechSynthesis.cancel();
      const clean = text
        .replace(/\\\(|\\\)|\\\[|\\\]|\$+/g, " ")
        .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "$1 over $2")
        .replace(/[#*_`>~|]/g, " ");
      const u = new SpeechSynthesisUtterance(clean);
      const lang = guessLang(text, uiLanguage);
      u.lang = lang;
      const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang));
      if (voice) u.voice = voice;
      u.rate = 0.95;
      u.onend = () => setSpeakingId((cur) => (cur === id ? null : cur));
      u.onerror = () => setSpeakingId((cur) => (cur === id ? null : cur));
      setSpeakingId(id);
      window.speechSynthesis.speak(u);
    },
    [supported, uiLanguage],
  );

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, [supported]);

  return { supported: supported && enabled, speakingId, speak, stop };
}

/** Optional, gentle feedback sounds (off by default; feedback is always visual too). */
export function useFeedbackSound() {
  const on = usePrefs((s) => s.a11y.sounds);
  const ctx = useRef<AudioContext | null>(null);
  return useCallback(
    (kind: "correct" | "incorrect") => {
      if (!on || typeof window === "undefined" || !("AudioContext" in window)) return;
      ctx.current ??= new AudioContext();
      const ac = ctx.current;
      const notes = kind === "correct" ? [523.25, 659.25] : [329.63, 261.63];
      notes.forEach((f, i) => {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = "sine";
        o.frequency.value = f;
        const t = ac.currentTime + i * 0.12;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
        o.connect(g).connect(ac.destination);
        o.start(t);
        o.stop(t + 0.22);
      });
    },
    [on],
  );
}

/** The current topic for a mentor, trimmed. */
export function useTopic(mentorId: MentorId) {
  return useTopicStore((s) => (s.topics[mentorId] ?? "").trim());
}
