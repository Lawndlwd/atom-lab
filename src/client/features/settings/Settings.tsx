import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { trpc } from "../../trpc";
import { useAuth } from "../../providers/auth";
import { usePush } from "../../providers/push";
import { ThemeToggle } from "../../components/ThemeToggle";

export default function Settings() {
  const nav = useNavigate();
  const { user, refetch } = useAuth();
  const util = trpc.useUtils();
  const push = usePush();
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const signOut = trpc.auth.signOut.useMutation({
    onSuccess: async () => {
      await util.invalidate();
      await refetch();
      nav("/signin", { replace: true });
    },
  });

  async function onEnable() {
    setErr(null);
    setMsg(null);
    try {
      await push.enable();
      setMsg("Push notifications enabled.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }
  async function onDisable() {
    setErr(null);
    setMsg(null);
    try {
      await push.disable();
      setMsg("Push disabled.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }
  async function onTest() {
    setErr(null);
    setMsg(null);
    try {
      const r = await push.test();
      setMsg(`Sent ${r.sent}/${r.total} test push(es).`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="px-5 pt-10 pb-6 lg:p-14 max-w-2xl">
      <div className="eyebrow">Settings</div>
      <h1 className="title-lg mt-2">Your knobs.</h1>

      <section className="card mt-8">
        <div className="eyebrow">Account</div>
        <div className="mt-3" style={{ fontSize: 14 }}>
          <div>
            Signed in as <strong>{user?.name}</strong>
          </div>
          <div style={{ color: "var(--ink-3)", fontSize: 12 }}>{user?.email}</div>
          <div style={{ color: "var(--ink-3)", fontSize: 12, marginTop: 4 }}>
            Timezone: {user?.timezone ?? "UTC"}
          </div>
        </div>
        <div className="mt-5">
          <button
            className="btn btn-secondary"
            onClick={() => signOut.mutate()}
            disabled={signOut.isPending}
          >
            {signOut.isPending ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </section>

      <section className="card mt-6">
        <div className="eyebrow">Appearance</div>
        <p className="body-sm mt-3">Pick your canvas.</p>
        <div className="mt-4">
          <ThemeToggle variant="inline" />
        </div>
      </section>

      <section className="card mt-6">
        <div className="eyebrow">Notifications</div>
        <p className="body-sm mt-3">Get a lock-screen push at each identity's scheduled time.</p>
        {!push.vapidConfigured && (
          <p className="body-sm mt-3" style={{ color: "var(--amber)" }}>
            Server missing VAPID keys. Run <code>pnpm vapid</code>, add keys to <code>.env</code>,
            restart.
          </p>
        )}
        {push.isIos && !push.isStandalone && (
          <p className="body-sm mt-3" style={{ color: "var(--ink-3)" }}>
            iOS: add to home screen first (Share → Add to Home Screen) — then come back here.
          </p>
        )}
        <div className="flex gap-2 mt-4 flex-wrap">
          <button
            className="btn btn-primary"
            disabled={push.enabling || !push.vapidConfigured}
            onClick={onEnable}
          >
            {push.enabling ? "Enabling…" : "Enable push"}
          </button>
          <button className="btn btn-secondary" onClick={onDisable}>
            Disable
          </button>
          <button
            className="btn btn-ghost"
            disabled={push.testing || !push.vapidConfigured}
            onClick={onTest}
          >
            {push.testing ? "Sending…" : "Send test"}
          </button>
        </div>
        {err && (
          <div className="body-sm mt-3" style={{ color: "var(--red)" }}>
            {err}
          </div>
        )}
        {msg && (
          <div className="body-sm mt-3" style={{ color: "var(--teal)" }}>
            {msg}
          </div>
        )}
      </section>
    </div>
  );
}
