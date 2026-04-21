import { useReducer, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { trpc } from "../../trpc";
import { useAuth } from "../../providers/auth";
import {
  CADENCES,
  DEFAULT_IDENTITY_SUGGESTIONS,
  DEFAULT_JOURNAL_TYPES,
} from "../../../shared/constants";
import { IconPlus, IconEye, IconHeart, IconFeather, IconCheckCircle } from "../../components/icons";

type IdentityDraft = {
  _uid: string;
  statement: string;
  action: string;
  scheduledTime: string;
  cadence: string;
  cueLocation?: string;
  stackAfter?: string;
  mindsetReframe?: string;
  immediateReward?: string;
};
type JournalTypeDraft = { slug: string; label: string; color: string; order: number };
type BadHabitDraft = {
  _uid: string;
  name: string;
  description?: string;
  invisibleAction?: string;
  unattractiveReframe?: string;
  difficultAction?: string;
  unsatisfyingConsequence?: string;
};

function uid() {
  return crypto.randomUUID();
}

type State = {
  step: number;
  name: string;
  timezone: string;
  identities: IdentityDraft[];
  journalTypes: JournalTypeDraft[];
  ruleText: string;
  extraRules: string[];
  badHabits: BadHabitDraft[];
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
  | { type: "journalRemove"; i: number }
  | { type: "badHabitPatch"; i: number; patch: Partial<BadHabitDraft> }
  | { type: "badHabitAdd" }
  | { type: "badHabitRemove"; i: number };

function slugify(input: string, taken: Set<string>): string {
  let base = input
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  if (!base) base = "tab";
  if (!taken.has(base)) return base;
  for (let n = 2; n < 999; n++) {
    const suffix = `-${n}`;
    const candidate = base.slice(0, 40 - suffix.length) + suffix;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`.slice(0, 40);
}

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
          { _uid: uid(), statement: "", action: "", scheduledTime: "09:00", cadence: "daily" },
        ],
      };
    case "identityRemove":
      return { ...s, identities: s.identities.filter((_, i) => i !== a.i) };
    case "journalPatch": {
      const js = s.journalTypes.slice();
      const next = { ...js[a.i], ...a.patch };
      if (a.patch.label !== undefined) {
        const taken = new Set(js.filter((_, idx) => idx !== a.i).map((t) => t.slug));
        next.slug = slugify(a.patch.label, taken);
      }
      js[a.i] = next;
      return { ...s, journalTypes: js };
    }
    case "journalAdd": {
      const taken = new Set(s.journalTypes.map((t) => t.slug));
      return {
        ...s,
        journalTypes: [
          ...s.journalTypes,
          {
            slug: slugify("tab", taken),
            label: "",
            color: "#7cb5a5",
            order: s.journalTypes.length,
          },
        ],
      };
    }
    case "journalRemove":
      return { ...s, journalTypes: s.journalTypes.filter((_, i) => i !== a.i) };
    case "badHabitPatch": {
      const bh = s.badHabits.slice();
      bh[a.i] = { ...bh[a.i], ...a.patch };
      return { ...s, badHabits: bh };
    }
    case "badHabitAdd":
      return {
        ...s,
        badHabits: [...s.badHabits, { _uid: uid(), name: "" }],
      };
    case "badHabitRemove":
      return { ...s, badHabits: s.badHabits.filter((_, i) => i !== a.i) };
  }
}

function initialState(name: string, timezone: string): State {
  return {
    step: 0,
    name,
    timezone,
    identities: DEFAULT_IDENTITY_SUGGESTIONS.slice(0, 3).map((i) => ({ _uid: uid(), ...i })),
    journalTypes: DEFAULT_JOURNAL_TYPES.map((j) => ({ ...j })),
    ruleText: "One new habit per month. All active must hold 14 days before unlock.",
    extraRules: [],
    badHabits: [],
    cooldown: 30,
    minStreak: 14,
    maxActive: 5,
    pushOptIn: false,
  };
}

const STEPS = [
  "You",
  "Identities",
  "Journals",
  "Rule",
  "Bad habits",
  "Notifications",
  "Review",
] as const;

const STEP_YOU = 0;
const STEP_IDENTITIES = 1;
const STEP_JOURNALS = 2;
const STEP_RULE = 3;
const STEP_BAD_HABITS = 4;
const STEP_NOTIFICATIONS = 5;
const STEP_REVIEW = 6;

export default function Onboarding() {
  const nav = useNavigate();
  const { user, refetch } = useAuth();
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const [s, dispatch] = useReducer(reducer, null, () => initialState(user?.name ?? "", browserTz));

  const importData = trpc.data.import.useMutation();
  const complete = trpc.onboarding.complete.useMutation({
    onSuccess: async () => {
      const me = await refetch();
      const goodBads = s.badHabits.filter((b) => b.name.trim().length > 0);
      if ((s.extraRules.length || goodBads.length) && me?.onboardedAt) {
        try {
          await importData.mutateAsync({
            rules: s.extraRules.length ? s.extraRules.map((text) => ({ text })) : undefined,
            badHabits: goodBads.length
              ? goodBads.map((b) => ({
                  name: b.name.trim(),
                  description: b.description?.trim() || undefined,
                  invisibleAction: b.invisibleAction?.trim() || undefined,
                  unattractiveReframe: b.unattractiveReframe?.trim() || undefined,
                  difficultAction: b.difficultAction?.trim() || undefined,
                  unsatisfyingConsequence: b.unsatisfyingConsequence?.trim() || undefined,
                }))
              : undefined,
          });
        } catch {
          /* non-fatal — user can add them from Habits page */
        }
      }
      if (me?.onboardedAt) nav("/today", { replace: true });
    },
  });

  const total = STEPS.length;

  function canNext(): boolean {
    if (s.step === STEP_YOU) return s.name.trim().length > 0 && s.timezone.trim().length > 0;
    if (s.step === STEP_IDENTITIES) {
      if (s.identities.length < 1 || s.identities.length > 10) return false;
      return s.identities.every(
        (i) =>
          i.statement.trim().length > 0 &&
          i.action.trim().length > 0 &&
          /^\d{2}:\d{2}$/.test(i.scheduledTime),
      );
    }
    if (s.step === STEP_JOURNALS) {
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
    if (s.step === STEP_RULE) return s.cooldown >= 0 && s.minStreak >= 0 && s.maxActive >= 1;
    if (s.step === STEP_BAD_HABITS) {
      return s.badHabits.every((b) => !b.name || b.name.trim().length <= 120);
    }
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
        cueLocation: i.cueLocation?.trim() || undefined,
        stackAfter: i.stackAfter?.trim() || undefined,
        mindsetReframe: i.mindsetReframe?.trim() || undefined,
        immediateReward: i.immediateReward?.trim() || undefined,
      })),
      journalTypes: s.journalTypes.map((t, idx) => ({
        slug: t.slug,
        label: t.label.trim(),
        color: t.color,
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

  const namedBadHabits = s.badHabits.filter((b) => b.name.trim().length > 0);

  return (
    <div
      className="min-h-dvh px-6 pt-10 pb-8 lg:p-14 max-w-3xl mx-auto"
      style={{
        paddingTop: "calc(40px + env(safe-area-inset-top))",
        paddingBottom: "calc(32px + env(safe-area-inset-bottom))",
      }}
    >
      <div className="eyebrow eyebrow-teal">
        Onboarding · step {s.step + 1} of {total}
      </div>
      <div className="flex gap-1.5 mt-3 mb-8">
        {STEPS.map((label, i) => (
          <div
            key={label}
            style={{
              width: 30,
              height: 3,
              borderRadius: 2,
              background:
                i < s.step
                  ? "var(--teal)"
                  : i === s.step
                    ? "color-mix(in srgb, var(--teal) 45%, transparent)"
                    : "var(--bg-2)",
            }}
          />
        ))}
      </div>

      <JsonPrefill dispatch={dispatch} />
      {(s.extraRules.length > 0 || namedBadHabits.length > 0) && (
        <div className="body-sm mb-6" style={{ color: "var(--ink-3)", fontSize: 11 }}>
          {[
            s.extraRules.length ? `${s.extraRules.length} rule(s)` : null,
            namedBadHabits.length ? `${namedBadHabits.length} bad habit(s)` : null,
          ]
            .filter(Boolean)
            .join(" · ")}{" "}
          will be added right after onboarding.
        </div>
      )}

      {s.step === STEP_YOU && (
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

      {s.step === STEP_IDENTITIES && (
        <StepCard
          title="Your identities."
          hint={
            'Three to five is plenty. "I am a _____." + what that means today. Expand "Four Laws" to shape the cue, craving, response, and reward.'
          }
        >
          <div className="flex flex-col gap-3">
            {s.identities.map((id, i) => (
              <IdentityCard
                key={id._uid}
                draft={id}
                index={i}
                canRemove={s.identities.length > 1}
                onPatch={(patch) => dispatch({ type: "identityPatch", i, patch })}
                onRemove={() => dispatch({ type: "identityRemove", i })}
              />
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

      {s.step === STEP_JOURNALS && (
        <StepCard
          title="Your journal tabs."
          hint="Default is Daily + Lab + Dreams + Ideas. Pick your own colors and rename to what you actually track."
        >
          <div className="flex flex-col gap-3">
            {s.journalTypes.map((t, i) => (
              <div key={t.slug} className="card" style={{ padding: 14, background: "var(--bg-1)" }}>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <label
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 999,
                      border: "0.5px solid var(--line-2)",
                      background: t.color,
                      cursor: "pointer",
                      flexShrink: 0,
                      position: "relative",
                      overflow: "hidden",
                    }}
                    title="Pick color"
                  >
                    <input
                      type="color"
                      value={t.color}
                      onChange={(e) =>
                        dispatch({ type: "journalPatch", i, patch: { color: e.target.value } })
                      }
                      style={{ opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
                    />
                  </label>
                  <input
                    className="input"
                    placeholder="label (Market log)"
                    value={t.label}
                    maxLength={40}
                    onChange={(e) =>
                      dispatch({ type: "journalPatch", i, patch: { label: e.target.value } })
                    }
                    style={{ flex: 1, minWidth: 0 }}
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
                <div
                  className="meta"
                  style={{
                    fontSize: 10,
                    color: "var(--ink-4)",
                    marginTop: 6,
                    paddingLeft: 46,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={`id · ${t.slug}`}
                >
                  id · {t.slug}
                </div>
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

      {s.step === STEP_RULE && (
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

      {s.step === STEP_BAD_HABITS && (
        <StepCard
          title="What are you weakening?"
          hint="Optional. Name the bad habits you want to make invisible, unattractive, difficult, and unsatisfying."
        >
          <div className="flex flex-col gap-3">
            {s.badHabits.map((b, i) => (
              <BadHabitCard
                key={b._uid}
                draft={b}
                index={i}
                onPatch={(patch) => dispatch({ type: "badHabitPatch", i, patch })}
                onRemove={() => dispatch({ type: "badHabitRemove", i })}
              />
            ))}
            <button
              type="button"
              className="btn btn-secondary self-start"
              onClick={() => dispatch({ type: "badHabitAdd" })}
            >
              <IconPlus /> Add bad habit
            </button>
            {s.badHabits.length === 0 && (
              <p className="body-sm" style={{ color: "var(--ink-3)", fontSize: 12 }}>
                Skip if none come to mind. You can add them anytime from the Habits page.
              </p>
            )}
          </div>
        </StepCard>
      )}

      {s.step === STEP_NOTIFICATIONS && (
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

      {s.step === STEP_REVIEW && (
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
            <Row
              k="Bad habits"
              v={namedBadHabits.length ? `${namedBadHabits.length}` : "—"}
              detail={namedBadHabits.map((b) => b.name).join(" · ")}
            />
            {s.extraRules.length > 0 && (
              <Row k="Extra rules" v={`${s.extraRules.length}`} detail={s.extraRules.join(" · ")} />
            )}
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

function IdentityCard({
  draft,
  index,
  canRemove,
  onPatch,
  onRemove,
}: {
  draft: IdentityDraft;
  index: number;
  canRemove: boolean;
  onPatch: (patch: Partial<IdentityDraft>) => void;
  onRemove: () => void;
}) {
  const hasLaws = !!(
    draft.cueLocation ||
    draft.stackAfter ||
    draft.mindsetReframe ||
    draft.immediateReward
  );
  const [open, setOpen] = useState(hasLaws);

  return (
    <div className="card" style={{ padding: 14, background: "var(--bg-1)" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="meta">#{index + 1}</span>
        {canRemove && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onRemove}
            style={{ fontSize: 11 }}
          >
            Remove
          </button>
        )}
      </div>
      <input
        className="input mb-2"
        placeholder="I am a reader."
        value={draft.statement}
        onChange={(e) => onPatch({ statement: e.target.value })}
      />
      <input
        className="input mb-2"
        placeholder="Read 1 page before bed"
        value={draft.action}
        onChange={(e) => onPatch({ action: e.target.value })}
      />
      <div className="flex gap-2">
        <input
          className="input"
          type="time"
          value={draft.scheduledTime}
          onChange={(e) => onPatch({ scheduledTime: e.target.value })}
          style={{ flex: 1 }}
        />
        <select
          className="input"
          value={draft.cadence}
          onChange={(e) => onPatch({ cadence: e.target.value })}
          style={{ flex: 1 }}
        >
          {CADENCES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: 12, paddingTop: 10, borderTop: "0.5px dashed var(--line-2)" }}>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setOpen((v) => !v)}
          style={{ fontSize: 11, paddingLeft: 0 }}
        >
          {open ? "− Hide Four Laws" : "+ Four Laws (optional)"}
        </button>
        {open && (
          <div className="flex flex-col gap-2 mt-2">
            <LawField
              Icon={IconEye}
              label="Obvious — cue / location"
              placeholder="On my nightstand"
              value={draft.cueLocation ?? ""}
              onChange={(v) => onPatch({ cueLocation: v })}
              max={120}
            />
            <LawField
              Icon={IconHeart}
              label="Attractive — stack after"
              placeholder="I brush my teeth"
              value={draft.stackAfter ?? ""}
              onChange={(v) => onPatch({ stackAfter: v })}
              max={200}
            />
            <LawField
              Icon={IconFeather}
              label="Easy — mindset reframe"
              placeholder="read 1 page to remember I'm a reader"
              value={draft.mindsetReframe ?? ""}
              onChange={(v) => onPatch({ mindsetReframe: v })}
              max={280}
              prefix="Because I get to"
            />
            <LawField
              Icon={IconCheckCircle}
              label="Satisfying — immediate reward"
              placeholder="Mark a tally on the fridge"
              value={draft.immediateReward ?? ""}
              onChange={(v) => onPatch({ immediateReward: v })}
              max={200}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function LawField({
  Icon,
  label,
  placeholder,
  value,
  onChange,
  max,
  prefix,
}: {
  Icon: (props: { size?: number }) => JSX.Element;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  prefix?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span
        className="eyebrow"
        style={{
          fontSize: 10,
          color: "var(--ink-3)",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Icon size={11} />
        {label}
      </span>
      {prefix ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "var(--bg)",
            border: "0.5px solid var(--line-2)",
            borderRadius: "var(--r-md)",
            padding: "0 10px",
          }}
        >
          <span style={{ color: "var(--ink-3)", fontSize: 12, whiteSpace: "nowrap" }}>
            {prefix}
          </span>
          <input
            className="input"
            style={{ border: 0, background: "transparent", flex: 1, paddingLeft: 6 }}
            placeholder={placeholder}
            value={value}
            maxLength={max}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      ) : (
        <input
          className="input"
          placeholder={placeholder}
          value={value}
          maxLength={max}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

function BadHabitCard({
  draft,
  index,
  onPatch,
  onRemove,
}: {
  draft: BadHabitDraft;
  index: number;
  onPatch: (patch: Partial<BadHabitDraft>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="card" style={{ padding: 14, background: "var(--bg-1)" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="meta">#{index + 1}</span>
        <button type="button" className="btn btn-ghost" onClick={onRemove} style={{ fontSize: 11 }}>
          Remove
        </button>
      </div>
      <input
        className="input mb-2"
        placeholder="Scrolling in bed"
        value={draft.name}
        maxLength={120}
        onChange={(e) => onPatch({ name: e.target.value })}
      />
      <input
        className="input mb-3"
        placeholder="description (optional)"
        value={draft.description ?? ""}
        maxLength={400}
        onChange={(e) => onPatch({ description: e.target.value })}
      />
      <div className="flex flex-col gap-2">
        <LawField
          Icon={IconEye}
          label="Make it invisible — remove the cue"
          placeholder="Phone charges in the kitchen at 21:30"
          value={draft.invisibleAction ?? ""}
          onChange={(v) => onPatch({ invisibleAction: v })}
          max={280}
        />
        <LawField
          Icon={IconHeart}
          label="Make it unattractive — reframe"
          placeholder="Every scroll is a vote for the distracted me"
          value={draft.unattractiveReframe ?? ""}
          onChange={(v) => onPatch({ unattractiveReframe: v })}
          max={280}
        />
        <LawField
          Icon={IconFeather}
          label="Make it difficult — add friction"
          placeholder="Apps uninstalled; grayscale after 21:00"
          value={draft.difficultAction ?? ""}
          onChange={(v) => onPatch({ difficultAction: v })}
          max={280}
        />
        <LawField
          Icon={IconCheckCircle}
          label="Make it unsatisfying — visible cost"
          placeholder="$20 to a friend if I scroll past 21:30"
          value={draft.unsatisfyingConsequence ?? ""}
          onChange={(v) => onPatch({ unsatisfyingConsequence: v })}
          max={280}
        />
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

type Dispatch = (a: Action) => void;

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
}

function clamp(s: string | undefined, max: number): string | undefined {
  if (!s) return undefined;
  return s.length > max ? s.slice(0, max) : s;
}

function normalizeIdentity(i: Record<string, unknown>): IdentityDraft {
  const cue = str(i.cueLocation) ?? str(i.cue) ?? str(i.location) ?? str(i.where) ?? str(i.obvious);
  const stack = str(i.stackAfter) ?? str(i.stack) ?? str(i.after) ?? str(i.attractive);
  const reframe =
    str(i.mindsetReframe) ?? str(i.reframe) ?? str(i.mindset) ?? str(i.because) ?? str(i.easy);
  const reward = str(i.immediateReward) ?? str(i.reward) ?? str(i.then) ?? str(i.satisfying);
  return {
    _uid: uid(),
    statement: String(i.statement ?? ""),
    action: String(i.action ?? ""),
    scheduledTime: String(i.scheduledTime ?? i.time ?? "09:00"),
    cadence: String(i.cadence ?? "daily"),
    cueLocation: clamp(cue, 120),
    stackAfter: clamp(stack, 200),
    mindsetReframe: clamp(reframe, 280),
    immediateReward: clamp(reward, 200),
  };
}

function normalizeBadHabit(b: Record<string, unknown>): BadHabitDraft | null {
  const name = str(b.name) ?? str(b.behavior) ?? str(b.statement);
  if (!name) return null;
  const descParts = [
    str(b.statement) && str(b.name ?? b.behavior) ? str(b.statement) : undefined,
    str(b.trigger) ? `Trigger: ${str(b.trigger)}` : undefined,
    str(b.replacement) ? `Replace with: ${str(b.replacement)}` : undefined,
    str(b.description),
  ].filter(Boolean);
  const description = descParts.length ? descParts.join(" · ") : undefined;
  return {
    _uid: uid(),
    name: clamp(name, 120)!,
    description: clamp(description, 400),
    invisibleAction: clamp(str(b.invisibleAction) ?? str(b.invisible) ?? str(b.obvious), 280),
    unattractiveReframe: clamp(
      str(b.unattractiveReframe) ?? str(b.unattractive) ?? str(b.reframe),
      280,
    ),
    difficultAction: clamp(str(b.difficultAction) ?? str(b.difficult) ?? str(b.friction), 280),
    unsatisfyingConsequence: clamp(
      str(b.unsatisfyingConsequence) ?? str(b.unsatisfying) ?? str(b.cost),
      280,
    ),
  };
}

const JSON_PREFILL_EXAMPLE = `{
  "identities": [
    {
      "statement": "I am a reader.",
      "action": "Read 1 page",
      "scheduledTime": "22:00",
      "cadence": "daily",
      "cue": "Book on the pillow",
      "after": "I brush my teeth",
      "because": "reading is who I am",
      "reward": "Cross the day off on the wall calendar"
    }
  ],
  "journalTypes": [
    { "slug": "daily", "label": "Daily", "color": "#7cb5a5", "order": 0 },
    { "slug": "lab", "label": "Lab", "color": "#c9a66b", "order": 1 }
  ],
  "ruleText": "One new habit per month.",
  "cooldown": 30,
  "minStreak": 14,
  "maxActive": 5,
  "rules": ["No phone before 10am.", "Sunday is rest day."],
  "badHabits": [
    {
      "behavior": "Scrolling in bed",
      "trigger": "Phone on nightstand",
      "invisible": "Phone charges in the kitchen at 21:30.",
      "unattractive": "Every scroll is a vote for the distracted me.",
      "difficult": "Apps uninstalled; grayscale after 21:00.",
      "unsatisfying": "$20 to a friend if I scroll past 21:30.",
      "replacement": "Read 1 page instead."
    }
  ]
}`;

function JsonPrefill({ dispatch }: { dispatch: Dispatch }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function apply() {
    setErr(null);
    setMsg(null);
    let obj: Record<string, unknown>;
    try {
      obj = JSON.parse(text) as Record<string, unknown>;
    } catch (e) {
      setErr("Invalid JSON: " + (e instanceof Error ? e.message : String(e)));
      return;
    }
    const patch: Partial<State> = {};
    const applied: string[] = [];
    if (Array.isArray(obj.identities)) {
      patch.identities = (obj.identities as Record<string, unknown>[]).map((i) =>
        normalizeIdentity(i),
      );
      applied.push(`${patch.identities.length} identities`);
    }
    if (Array.isArray(obj.journalTypes)) {
      const taken = new Set<string>();
      patch.journalTypes = (obj.journalTypes as JournalTypeDraft[]).map((t, idx) => {
        const label = String(t.label ?? "");
        const seed = String(t.slug ?? label ?? `tab-${idx + 1}`);
        const slug = slugify(seed, taken);
        taken.add(slug);
        return {
          slug,
          label,
          color: /^#[0-9a-fA-F]{6}$/.test(String(t.color ?? "")) ? String(t.color) : "#7cb5a5",
          order: typeof t.order === "number" ? t.order : idx,
        };
      });
      applied.push(`${patch.journalTypes.length} journals`);
    }
    if (typeof obj.ruleText === "string") {
      patch.ruleText = obj.ruleText;
      applied.push("ruleText");
    }
    if (typeof obj.cooldown === "number") patch.cooldown = obj.cooldown;
    if (typeof obj.minStreak === "number") patch.minStreak = obj.minStreak;
    if (typeof obj.maxActive === "number") patch.maxActive = obj.maxActive;
    if (Array.isArray(obj.rules)) {
      const rules = (obj.rules as unknown[])
        .map((r) => (typeof r === "string" ? r : (r as { text?: unknown })?.text))
        .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
        .map((t) => t.trim());
      patch.extraRules = rules;
      applied.push(`${rules.length} rules (post-submit)`);
    }
    if (Array.isArray(obj.badHabits)) {
      const bh = (obj.badHabits as Record<string, unknown>[])
        .map((b) => normalizeBadHabit(b))
        .filter((b): b is BadHabitDraft => b !== null);
      patch.badHabits = bh;
      applied.push(`${bh.length} bad habits`);
    }
    if (applied.length === 0) {
      setErr(
        "No recognized fields. Supported: identities, journalTypes, ruleText, cooldown, minStreak, maxActive, rules, badHabits.",
      );
      return;
    }
    dispatch({ type: "set", patch });
    setMsg("Applied: " + applied.join(" · "));
    setText("");
  }

  if (!open) {
    return (
      <div className="mb-6">
        <button
          type="button"
          className="btn btn-ghost"
          style={{ fontSize: 12 }}
          onClick={() => setOpen(true)}
        >
          + Prefill from JSON
        </button>
      </div>
    );
  }

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between">
        <div className="eyebrow">Prefill from JSON</div>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ fontSize: 11 }}
          onClick={() => setOpen(false)}
        >
          Close
        </button>
      </div>
      <p className="body-sm mt-2" style={{ color: "var(--ink-3)" }}>
        Paste a JSON blob to fill identities (with Four Laws), journals, rule text, bad habits, and
        extra rules. Rules and bad habits are added right after you click Start tracking.
      </p>
      <textarea
        className="input mt-3"
        placeholder={JSON_PREFILL_EXAMPLE}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        style={{ fontFamily: "Geist Mono, monospace", fontSize: 12, width: "100%" }}
      />
      <div className="flex gap-2 mt-3 flex-wrap">
        <button type="button" className="btn btn-primary" onClick={apply} disabled={!text.trim()}>
          Apply
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setText(JSON_PREFILL_EXAMPLE)}
        >
          Load example
        </button>
      </div>
      {err && (
        <div className="body-sm mt-2" style={{ color: "var(--red)" }}>
          {err}
        </div>
      )}
      {msg && (
        <div className="body-sm mt-2" style={{ color: "var(--teal)" }}>
          {msg}
        </div>
      )}
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
