import { Link, Outlet } from "react-router-dom";
import { Logo } from "@/components/navigation/Logo";
import { LanguageSwitcher } from "@/components/navigation/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/store/authStore";
import { useT } from "@/i18n/strings";

export function PublicLayout() {
  const user = useAuth((s) => s.user);
  const t = useT();
  return (
    <div className="flex min-h-dvh flex-col bg-parchment">
      <header className="border-b border-ink/10">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Logo />
          <div className="ms-auto flex items-center gap-3">
            <LanguageSwitcher className="hidden sm:flex" />
            {user ? (
              <Button asChild size="sm">
                <Link to="/dashboard">{t("nav.dashboard")}</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/login">{t("nav.signIn")}</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/register">{t("nav.start")}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="bg-ink text-parchment/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm sm:flex-row sm:items-center sm:px-6">
          <Logo light />
          <p className="sm:ms-auto">
            An AI-powered academy of specialised mentors. AI answers are validated before delivery,
            but can still be wrong; always think critically.
          </p>
        </div>
      </footer>
    </div>
  );
}
