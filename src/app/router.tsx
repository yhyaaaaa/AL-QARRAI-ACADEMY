import { lazy, Suspense, type ComponentType } from "react";
import { createBrowserRouter } from "react-router-dom";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

// Authenticated screens are code-split: the landing page stays light.
function page<K extends string>(loader: () => Promise<Record<K, ComponentType>>, name: K) {
  const C: ComponentType = lazy(() =>
    loader().then((m) => ({ default: m[name] as ComponentType })),
  );
  return (
    <Suspense fallback={<p className="p-8 text-sm text-slate-deep">Loading…</p>}>
      <C />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: "/", element: <LandingPage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/account", element: page(() => import("@/pages/AccountPage"), "AccountPage") },
          {
            element: <RequireAuth role="student" />,
            children: [
              {
                path: "/dashboard",
                element: page(() => import("@/pages/DashboardPage"), "DashboardPage"),
              },
              {
                path: "/mentors",
                element: page(() => import("@/pages/MentorSelectionPage"), "MentorSelectionPage"),
              },
              {
                path: "/learn/:mentorId",
                element: page(() => import("@/pages/LearningPage"), "LearningPage"),
              },
              {
                path: "/progress",
                element: page(() => import("@/pages/ProgressPage"), "ProgressPage"),
              },
            ],
          },
          {
            element: <RequireAuth role="parent" />,
            children: [
              {
                path: "/parent",
                element: page(() => import("@/pages/ParentDashboardPage"), "ParentDashboardPage"),
              },
              {
                path: "/parent/welcome",
                element: page(() => import("@/pages/ParentWelcomePage"), "ParentWelcomePage"),
              },
            ],
          },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
