import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { trpc } from "../../trpc";
import { useAuth } from "../../providers/auth";

export default function SignUp() {
  const nav = useNavigate();
  const { refetch } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const signUp = trpc.auth.signUp.useMutation({
    onSuccess: async () => {
      await refetch();
      nav("/onboarding", { replace: true });
    },
    onError: (e) => setErr(e.message),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    signUp.mutate({ name, email, password });
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="card max-w-sm w-full">
        <div className="eyebrow">Identity</div>
        <h1 className="title-md mt-2">Create an account.</h1>

        <form className="mt-6 flex flex-col gap-3" onSubmit={onSubmit}>
          <input
            className="input"
            type="text"
            placeholder="Name"
            autoComplete="name"
            required
            minLength={1}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
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
            placeholder="Password (min 8)"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {err && <div style={{ color: "var(--red)", fontSize: 12 }}>{err}</div>}
          <button className="btn btn-primary mt-2" type="submit" disabled={signUp.isPending}>
            {signUp.isPending ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="body-sm mt-5">
          Already have an account?{" "}
          <Link className="link" to="/signin">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
