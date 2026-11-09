import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { BarChart3, HeartHandshake, LayoutDashboard, LogOut, UserRound, Users } from "lucide-react";
import { Logo } from "@/components/navigation/Logo";
import { LanguageSwitcher } from "@/components/navigation/LanguageSwitcher";
import { useAuth } from "@/store/authStore";
import { useT, type StringKey } from "@/i18n/strings";
import { cn } from "@/lib/utils";

const STUDENT_NAV: { to: string; label: StringKey; icon: typeof Users }[] = [
  { to: "/dashboard", label: "nav.dashboard", icon: LayoutDashboard },
  { to: "/mentors", label: "nav.mentors", icon: Users },
  { to: "/progress", label: "nav.progress", icon: BarChart3 },
];
const PARENT_NAV: { to: string; label: StringKey; icon: typeof Users }[] = [
  { to: "/parent", label: "nav.parent", icon: HeartHandshake },
];

export function AppLayout() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const NAV = profile?.account_type === "parent" ? PARENT_NAV : STUDENT_NAV;

  return (
    <div className="flex h-dvh flex-col bg-paper-grain">
      <header className="z-30 shrink-0 border-b border-ink/10 bg-parchment/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Logo to={profile?.account_type === "parent" ? "/parent" : "/dashboard"} />
          <nav className="ms-4 flex items-center gap-1" aria-label="Main">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-ink text-parchment"
                      : "text-ink/75 hover:bg-ink/5 hover:text-ink",
                  )
                }
              >
                <Icon className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t(label)}</span>
              </NavLink>
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-3">
            <LanguageSwitcher className="hidden md:flex" />
            <Link
              to="/account"
              className="flex items-center gap-2 rounded-full px-2 py-1 hover:bg-ink/5"
              data-testid="account-link"
            >
              <UserRound className="size-4 text-slate-deep" aria-hidden="true" />
              <span className="hidden text-sm font-medium lg:inline">
                {profile?.display_name ?? user?.email}
              </span>
            </Link>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
              className="flex size-9 cursor-pointer items-center justify-center rounded-full text-ink/70 hover:bg-ink/5 hover:text-ink"
              aria-label={t("nav.signOut")}
              title={t("nav.signOut")}
              data-testid="sign-out"
            >
              <LogOut className="size-4 rtl:-scale-x-100" />
            </button>
          </div>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
