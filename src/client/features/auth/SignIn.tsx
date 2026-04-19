import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { trpc } from "../../trpc";
import { useAuth } from "../../providers/auth";

export default function SignIn() {
  const nav = useNavigate();
  const { refetch } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const signIn = trpc.auth.signIn.useMutation({
    onSuccess: async (user) => {
      await refetch();
      nav(user.onboardedAt ? "/today" : "/onboarding", { replace: true });
    },
    onError: (e) => setErr(e.message),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    signIn.mutate({ email, password });
  }

  return (
    <div className="min-h-dvh grid place-items-center p-6">
      <div className="card max-w-sm w-full">
        <div className="eyebrow">Identity</div>
        <h1 className="title-md mt-2">Welcome back.</h1>

        <form className="mt-6 flex flex-col gap-3" onSubmit={onSubmit}>
          <input
            className="input"
            type="email"
            placeholder="Email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {err && <div style={{ color: "var(--red)", fontSize: 12 }}>{err}</div>}
          <button className="btn btn-primary mt-2" type="submit" disabled={signIn.isPending}>
            {signIn.isPending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="body-sm mt-5">
          No account?{" "}
          <Link className="link" to="/signup">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
