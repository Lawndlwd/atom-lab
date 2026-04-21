import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { RedirectIfAuthed, RequireAuth, useAuth } from "./providers/auth";
import SignIn from "./features/auth/SignIn";
import SignUp from "./features/auth/SignUp";
import Onboarding from "./features/onboarding/Onboarding";
import Today from "./features/today/Today";
import Week from "./features/week/Week";
import Review from "./features/review/Review";
import Journal from "./features/journal/Journal";
import Habits from "./features/habits/Habits";
import Settings from "./features/settings/Settings";

function ShellOutlet() {
  const { user } = useAuth();
  return (
    <AppShell userName={user?.name}>
      <Outlet />
    </AppShell>
  );
}

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/today" replace /> },
  {
    path: "/signin",
    element: (
      <RedirectIfAuthed>
        <SignIn />
      </RedirectIfAuthed>
    ),
  },
  {
    path: "/signup",
    element: (
      <RedirectIfAuthed>
        <SignUp />
      </RedirectIfAuthed>
    ),
  },
  {
    element: (
      <RequireAuth>
        <Outlet />
      </RequireAuth>
    ),
    children: [
      { path: "/onboarding", element: <Onboarding /> },
      {
        element: <ShellOutlet />,
        children: [
          { path: "/today", element: <Today /> },
          { path: "/week", element: <Week /> },
          { path: "/review", element: <Review /> },
          { path: "/journal", element: <Journal /> },
          { path: "/journal/day/:date", element: <Journal /> },
          { path: "/journal/entry/:entryId", element: <Journal /> },
          { path: "/habits", element: <Habits /> },
          { path: "/settings", element: <Settings /> },
        ],
      },
    ],
  },
]);
