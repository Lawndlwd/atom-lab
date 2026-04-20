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
  const resetOnboarding = trpc.onboarding.reset.useMutation({
    onSuccess: async () => {
      await util.invalidate();
      await refetch();
      nav("/onboarding", { replace: true });
    },
    onError: (e) => setErr(e.message),
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
    <div className="px-5 pt-10 pb-6 lg:p-14 w-full max-w-2xl mx-auto">
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

      <ImportJsonCard />

      <section className="card mt-6">
        <div className="eyebrow">Restart onboarding</div>
        <p className="body-sm mt-3">
          Wipe identities, backlog, rules, journal types, config, votes, reviews, and journal
          entries. Account stays. Use this if your first run was a test.
        </p>
        <button
          className="btn btn-secondary mt-4"
          style={{ color: "var(--red)" }}
          disabled={resetOnboarding.isPending}
          onClick={() => {
            if (
              confirm(
                "Wipe all onboarding data and start over? Identities, rules, backlog, journal entries, votes, and reviews will be deleted. This cannot be undone.",
              )
            ) {
              resetOnboarding.mutate({ confirm: true });
            }
          }}
        >
          {resetOnboarding.isPending ? "Wiping…" : "Wipe data & restart onboarding"}
        </button>
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

const IMPORT_EXAMPLE = `{
  "identities": [
    { "statement": "I am a reader.", "action": "Read 1 page", "scheduledTime": "22:00", "cadence": "daily" }
  ],
  "backlog": [
    { "statement": "I am a runner.", "action": "Run 2 km", "cadence": "weekdays", "scheduledTime": "07:00" }
  ],
  "rules": [
    { "text": "No phone before 10am." }
  ],
  "journalTypes": [
    { "slug": "writing", "label": "Writing", "order": 0 }
  ]
}`;

function ImportJsonCard() {
  const util = trpc.useUtils();
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const importMut = trpc.data.import.useMutation({
    onSuccess: async (res) => {
      setMsg(
        `Imported ${res.counts.identities} identities · ${res.counts.backlog} backlog · ${res.counts.rules} rules · ${res.counts.journalTypes} journal types.`,
      );
      setText("");
      await Promise.all([
        util.habits.dashboard.invalidate(),
        util.rules.list.invalidate(),
        util.identity.listAll.invalidate().catch(() => {}),
      ]);
    },
    onError: (e) => setErr(e.message),
  });

  function submit() {
    setErr(null);
    setMsg(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      setErr("Invalid JSON: " + (e instanceof Error ? e.message : String(e)));
      return;
    }
    importMut.mutate(parsed as Parameters<typeof importMut.mutate>[0]);
  }

  return (
    <section className="card mt-6">
      <div className="eyebrow">Import JSON</div>
      <p className="body-sm mt-3">
        Paste identities, future identities (backlog), rules, or journal types. Any missing key is
        skipped.
      </p>
      <textarea
        className="input mt-3"
        placeholder={IMPORT_EXAMPLE}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        style={{ fontFamily: "Geist Mono, monospace", fontSize: 12, width: "100%" }}
      />
      <div className="flex gap-2 mt-3 flex-wrap">
        <button
          className="btn btn-primary"
          disabled={importMut.isPending || !text.trim()}
          onClick={submit}
        >
          {importMut.isPending ? "Importing…" : "Import"}
        </button>
        <button className="btn btn-ghost" onClick={() => setText(IMPORT_EXAMPLE)}>
          Load example
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
  );
}
