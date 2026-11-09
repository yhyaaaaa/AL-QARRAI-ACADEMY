import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useT } from "@/i18n/strings";
import { useAuth } from "@/store/authStore";
import type { AccountType } from "@/types";
import { homeFor } from "@/lib/routes";

/** Requires a signed-in user; optionally a specific account type (students vs parents). */
export function RequireAuth({ role }: { role?: AccountType }) {
  const user = useAuth((s) => s.user);
  const profile = useAuth((s) => s.profile);
  const location = useLocation();
  const t = useT();
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (role && !profile) {
    return <p className="p-8 text-sm text-slate-deep">{t("common.loading")}</p>;
  }
  if (role && profile && profile.account_type !== role) {
    return <Navigate to={homeFor(profile.account_type)} replace />;
  }
  // new students set up their preferences first
  if (role === "student" && profile && !profile.onboarded_at && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }
  return <Outlet />;
}
