import { useReducer, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { trpc } from "../../trpc";
import { useAuth } from "../../providers/auth";
import {
  CADENCES,
  DEFAULT_IDENTITY_SUGGESTIONS,
  DEFAULT_JOURNAL_TYPES,
} from "../../../shared/constants";
import { IconPlus } from "../../components/icons";

type IdentityDraft = {
  statement: string;
  action: string;
  scheduledTime: string;
  cadence: string;
};
type JournalTypeDraft = { slug: string; label: string; order: number };

type State = {
  step: number;
  name: string;
  timezone: string;
  identities: IdentityDraft[];
  journalTypes: JournalTypeDraft[];
  ruleText: string;
  cooldown: number;
  minStreak: number;
  maxActive: number;
  pushOptIn: boolean;
};

type Action =
  | { type: "step"; step: number }
  | { type: "set"; patch: Partial<State> }
  | { type: "identityPatch"; i: number; patch: Partial<IdentityDraft> }
  | { type: "identityAdd" }
  | { type: "identityRemove"; i: number }
  | { type: "journalPatch"; i: number; patch: Partial<JournalTypeDraft> }
  | { type: "journalAdd" }
  | { type: "journalRemove"; i: number };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "step":
      return { ...s, step: a.step };
    case "set":
      return { ...s, ...a.patch };
    case "identityPatch": {
      const ids = s.identities.slice();
      ids[a.i] = { ...ids[a.i], ...a.patch };
      return { ...s, identities: ids };
    }
    case "identityAdd":
      return {
        ...s,
        identities: [
          ...s.identities,
          { statement: "", action: "", scheduledTime: "09:00", cadence: "daily" },
        ],
      };
    case "identityRemove": {
      const ids = s.identities.filter((_, i) => i !== a.i);
      return { ...s, identities: ids };
    }
    case "journalPatch": {
      const js = s.journalTypes.slice();
      js[a.i] = { ...js[a.i], ...a.patch };
      return { ...s, journalTypes: js };
    }
    case "journalAdd":
      return {
        ...s,
        journalTypes: [
          ...s.journalTypes,
          { slug: `type_${s.journalTypes.length + 1}`, label: "New", order: s.journalTypes.length },
        ],
      };
    case "journalRemove":
      return { ...s, journalTypes: s.journalTypes.filter((_, i) => i !== a.i) };
  }
}

function initialState(name: string, timezone: string): State {
  return {
    step: 0,
    name,
    timezone,
    identities: DEFAULT_IDENTITY_SUGGESTIONS.slice(0, 3),
    journalTypes: DEFAULT_JOURNAL_TYPES.map((j) => ({ ...j })),
    ruleText: "One new habit per month. All active must hold 14 days before unlock.",
    cooldown: 30,
    minStreak: 14,
    maxActive: 5,
    pushOptIn: false,
  };
}

const STEPS = ["You", "Identities", "Journals", "Rule", "Notifications", "Review"] as const;

export default function Onboarding() {
  const nav = useNavigate();
  const { user, refetch } = useAuth();
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const [s, dispatch] = useReducer(reducer, null, () => initialState(user?.name ?? "", browserTz));

  const complete = trpc.onboarding.complete.useMutation({
    onSuccess: async () => {
      const me = await refetch();
      if (me?.onboardedAt) nav("/today", { replace: true });
    },
  });

  const total = STEPS.length;

  function canNext(): boolean {
    if (s.step === 0) return s.name.trim().length > 0 && s.timezone.trim().length > 0;
    if (s.step === 1) {
      if (s.identities.length < 1 || s.identities.length > 10) return false;
      return s.identities.every(
        (i) =>
          i.statement.trim().length > 0 &&
          i.action.trim().length > 0 &&
          /^\d{2}:\d{2}$/.test(i.scheduledTime),
      );
    }
    if (s.step === 2) {
      if (s.journalTypes.length < 1) return false;
      const slugs = new Set<string>();
      for (const t of s.journalTypes) {
        if (!/^[a-z0-9_-]+$/.test(t.slug)) return false;
        if (slugs.has(t.slug)) return false;
        slugs.add(t.slug);
        if (!t.label.trim()) return false;
      }
      return true;
    }
    if (s.step === 3) return s.cooldown >= 0 && s.minStreak >= 0 && s.maxActive >= 1;
    return true;
  }

  function next() {
    if (!canNext()) return;
    dispatch({ type: "step", step: Math.min(s.step + 1, total - 1) });
  }
  function back() {
    dispatch({ type: "step", step: Math.max(s.step - 1, 0) });
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    complete.mutate({
      name: s.name.trim(),
      timezone: s.timezone.trim(),
      identities: s.identities.map((i) => ({
        statement: i.statement.trim(),
        action: i.action.trim(),
        scheduledTime: i.scheduledTime,
        cadence: i.cadence as "daily" | "weekdays" | "5x_week" | "weekends" | "custom",
      })),
      journalTypes: s.journalTypes.map((t, idx) => ({
        slug: t.slug,
        label: t.label.trim(),
        order: idx,
      })),
      config: {
        ruleText: s.ruleText,
        newHabitCooldown: s.cooldown,
        minimumStreak: s.minStreak,
        maxActiveHabits: s.maxActive,
      },
    });
  }

  return (
    <div className="min-h-screen px-6 pt-10 pb-8 lg:p-14 max-w-3xl mx-auto">
      <div className="eyebrow eyebrow-teal">
        Onboarding · step {s.step + 1} of {total}
      </div>
      <div className="flex gap-1.5 mt-3 mb-8">
        {STEPS.map((_, i) => (
          <div
            key={i}
            style={{
              width: 30,
              height: 3,
              borderRadius: 2,
              background: i < s.step ? "var(--teal)" : i === s.step ? "var(--ink)" : "var(--bg-2)",
            }}
          />
        ))}
      </div>

      {s.step === 0 && (
        <StepCard
          title="Who are you?"
          hint="This seeds your identity page. You can change everything later."
        >
          <label className="eyebrow">Name</label>
          <input
            className="input mt-1.5"
            value={s.name}
            onChange={(e) => dispatch({ type: "set", patch: { name: e.target.value } })}
          />
          <div className="mt-5" />
          <label className="eyebrow">Timezone</label>
          <input
            className="input mt-1.5"
            value={s.timezone}
            onChange={(e) => dispatch({ type: "set", patch: { timezone: e.target.value } })}
          />
          <div className="body-sm mt-2" style={{ color: "var(--ink-3)" }}>
            Detected: <code>{browserTz}</code>
          </div>
        </StepCard>
      )}

      {s.step === 1 && (
        <StepCard
          title="Your identities."
          hint={'Three to five is plenty. "I am a _____." + what that means today.'}
        >
          <div className="flex flex-col gap-3">
            {s.identities.map((id, i) => (
              <div key={i} className="card" style={{ padding: 14, background: "var(--bg-1)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="meta">#{i + 1}</span>
                  {s.identities.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => dispatch({ type: "identityRemove", i })}
                      style={{ fontSize: 11 }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input
                  className="input mb-2"
                  placeholder="I am a reader."
                  value={id.statement}
                  onChange={(e) =>
                    dispatch({ type: "identityPatch", i, patch: { statement: e.target.value } })
                  }
                />
                <input
                  className="input mb-2"
                  placeholder="Read 1 page before bed"
                  value={id.action}
                  onChange={(e) =>
                    dispatch({ type: "identityPatch", i, patch: { action: e.target.value } })
                  }
                />
                <div className="flex gap-2">
                  <input
                    className="input"
                    type="time"
                    value={id.scheduledTime}
                    onChange={(e) =>
                      dispatch({
                        type: "identityPatch",
                        i,
                        patch: { scheduledTime: e.target.value },
                      })
                    }
                    style={{ flex: 1 }}
                  />
                  <select
                    className="input"
                    value={id.cadence}
                    onChange={(e) =>
                      dispatch({ type: "identityPatch", i, patch: { cadence: e.target.value } })
                    }
                    style={{ flex: 1 }}
                  >
                    {CADENCES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
            {s.identities.length < 10 && (
              <button
                type="button"
                className="btn btn-secondary self-start"
                onClick={() => dispatch({ type: "identityAdd" })}
              >
                <IconPlus /> Add another
              </button>
            )}
          </div>
        </StepCard>
      )}

      {s.step === 2 && (
        <StepCard
          title="Your journal tabs."
          hint="Default is Log + Lab. Rename to what you actually track — gym, meals, market, whatever."
        >
          <div className="flex flex-col gap-3">
            {s.journalTypes.map((t, i) => (
              <div
                key={i}
                className="card"
                style={{ padding: 14, background: "var(--bg-1)", display: "flex", gap: 10 }}
              >
                <input
                  className="input"
                  placeholder="label (Market log)"
                  value={t.label}
                  onChange={(e) =>
                    dispatch({ type: "journalPatch", i, patch: { label: e.target.value } })
                  }
                  style={{ flex: 2 }}
                />
                <input
                  className="input"
                  placeholder="slug"
                  value={t.slug}
                  onChange={(e) =>
                    dispatch({
                      type: "journalPatch",
                      i,
                      patch: {
                        slug: e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9_-]/g, "-")
                          .slice(0, 40),
                      },
                    })
                  }
                  style={{ flex: 1 }}
                />
                {s.journalTypes.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => dispatch({ type: "journalRemove", i })}
                    style={{ fontSize: 11 }}
                  >
                    X
                  </button>
                )}
              </div>
            ))}
            {s.journalTypes.length < 6 && (
              <button
                type="button"
                className="btn btn-secondary self-start"
                onClick={() => dispatch({ type: "journalAdd" })}
              >
                <IconPlus /> Add tab
              </button>
            )}
          </div>
        </StepCard>
      )}

      {s.step === 3 && (
        <StepCard
          title="Your rule."
          hint="The rule keeps the app from ballooning. Tweak if you have a reason; otherwise the defaults hold."
        >
          <label className="eyebrow">Rule text</label>
          <textarea
            className="textarea mt-1.5"
            value={s.ruleText}
            onChange={(e) => dispatch({ type: "set", patch: { ruleText: e.target.value } })}
          />
          <div className="grid grid-cols-3 gap-4 mt-5">
            <NumberField
              label="Cooldown (days)"
              value={s.cooldown}
              onChange={(v) => dispatch({ type: "set", patch: { cooldown: v } })}
            />
            <NumberField
              label="Min streak"
              value={s.minStreak}
              onChange={(v) => dispatch({ type: "set", patch: { minStreak: v } })}
            />
            <NumberField
              label="Max active"
              value={s.maxActive}
              onChange={(v) => dispatch({ type: "set", patch: { maxActive: v } })}
            />
          </div>
        </StepCard>
      )}

      {s.step === 4 && (
        <StepCard
          title="Notifications."
          hint="Optional. Land this later in Settings if you'd rather wait."
        >
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={s.pushOptIn}
              onChange={(e) => dispatch({ type: "set", patch: { pushOptIn: e.target.checked } })}
            />
            <span className="body-sm" style={{ color: "var(--ink)" }}>
              Yes — prompt me to enable push after this.
            </span>
          </label>
          <p className="body-sm mt-4" style={{ color: "var(--ink-3)" }}>
            On iOS you need to add this to your home screen first. Push lands fully in P8 — this is
            just the preference capture.
          </p>
        </StepCard>
      )}

      {s.step === 5 && (
        <StepCard
          title="Ready."
          hint="Give it a quick look. You can change anything later in Settings."
        >
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Row k="Name" v={s.name} />
            <Row k="Timezone" v={s.timezone} />
            <Row
              k="Identities"
              v={`${s.identities.length}`}
              detail={s.identities.map((i) => i.statement).join(" · ")}
            />
            <Row k="Journals" v={s.journalTypes.map((t) => t.label).join(" · ")} />
            <Row
              k="Rule"
              v={`cooldown ${s.cooldown}d · min ${s.minStreak}d · cap ${s.maxActive}`}
            />
            {complete.error && (
              <div style={{ color: "var(--red)", fontSize: 12 }}>{complete.error.message}</div>
            )}
            <button
              type="submit"
              className="btn btn-primary self-start mt-3"
              disabled={complete.isPending}
            >
              {complete.isPending ? "Saving…" : "Start tracking"}
            </button>
          </form>
        </StepCard>
      )}

      <div className="flex justify-between mt-8">
        <button type="button" className="btn btn-ghost" onClick={back} disabled={s.step === 0}>
          Back
        </button>
        {s.step < total - 1 && (
          <button type="button" className="btn btn-primary" onClick={next} disabled={!canNext()}>
            Next
          </button>
        )}
      </div>
    </div>
  );
}

function StepCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card">
      <h1 className="title-md">{title}</h1>
      {hint && (
        <p className="body-sm mt-2" style={{ color: "var(--ink-3)" }}>
          {hint}
        </p>
      )}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="eyebrow">{label}</label>
      <input
        className="input mt-1.5"
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function Row({ k, v, detail }: { k: string; v: string; detail?: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "130px 1fr",
        gap: 16,
        borderBottom: "0.5px solid var(--line)",
        paddingBottom: 10,
      }}
    >
      <div className="eyebrow">{k}</div>
      <div>
        <div style={{ color: "var(--ink)", fontSize: 14 }}>{v}</div>
        {detail && (
          <div className="body-sm" style={{ color: "var(--ink-3)", marginTop: 2 }}>
            {detail}
          </div>
        )}
      </div>
    </div>
  );
}
