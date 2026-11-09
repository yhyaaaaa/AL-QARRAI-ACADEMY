import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { useAuth } from "@/store/authStore";
import { MotionConfig } from "motion/react";
import { usePrefs } from "@/store/prefsStore";
import { PrefsEffects } from "./PrefsEffects";
import { LogoMark } from "@/components/navigation/Logo";
import { env } from "@/lib/env";

/** Shown instead of the app when the deployment is missing its Supabase configuration. */
function SetupRequired() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-parchment px-4">
      <div
        className="max-w-lg rounded-2xl border border-terracotta/40 bg-paper p-8 shadow-[var(--shadow-card)]"
        role="alert"
      >
        <LogoMark className="h-12 w-10" />
        <h1 className="mt-4 font-display text-3xl">Configuration required</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink/80">
          This Qarrai Academy deployment is not connected to its backend. The administrator must set
          <code className="mx-1 rounded bg-ink/5 px-1">VITE_SUPABASE_URL</code> and
          <code className="mx-1 rounded bg-ink/5 px-1">VITE_SUPABASE_ANON_KEY</code>
          in <code className="rounded bg-ink/5 px-1">.env</code> and rebuild. See the README.
        </p>
      </div>
    </div>
  );
}

export function App() {
  const initialized = useAuth((s) => s.initialized);
  const init = useAuth((s) => s.init);
  const reducedMotion = usePrefs((s) => s.a11y.reducedMotion);

  useEffect(() => {
    void init();
  }, [init]);

  if (!env.supabaseConfigured) return <SetupRequired />;
  if (!initialized) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-parchment" aria-busy="true">
        <LogoMark className="h-14 w-12 animate-pulse" />
      </div>
    );
  }
  return (
    <MotionConfig reducedMotion={reducedMotion ? "always" : "user"}>
      <PrefsEffects />
      <RouterProvider router={router} />
    </MotionConfig>
  );
}
