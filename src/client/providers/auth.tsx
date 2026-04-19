import { createContext, useContext, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { trpc } from "../trpc";

type AuthUser = {
  id: string;
  email: string;
  name: string;
  onboardedAt: Date | null;
  timezone: string;
} | null;

type AuthCtx = {
  user: AuthUser;
  loading: boolean;
  refetch: () => Promise<AuthUser>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  refetch: async () => null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const q = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
  const value: AuthCtx = {
    user: (q.data ?? null) as AuthUser,
    loading: q.isPending,
    refetch: async () => {
      const res = await q.refetch();
      return (res.data ?? null) as AuthUser;
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/signin" state={{ from: loc }} replace />;
  if (!user.onboardedAt && loc.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={user.onboardedAt ? "/today" : "/onboarding"} replace />;
  return <>{children}</>;
}
