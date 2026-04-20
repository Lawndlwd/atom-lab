import { useState, type FormEvent } from "react";
import { trpc } from "../../trpc";
import {
  IconLock,
  IconPlus,
  IconEye,
  IconHeart,
  IconFeather,
  IconCheckCircle,
} from "../../components/icons";
import { CADENCES } from "../../../shared/constants";
import { formatScheduledTime } from "../../hooks/useTodayDate";
import { useAuth } from "../../providers/auth";
import { EmptyState } from "../../components/EmptyState";

type Cadence = "daily" | "weekdays" | "5x_week" | "weekends" | "custom";

type BacklogRow = {
  id: string;
  statement: string;
  action: string;
  cadence: string;
  scheduledTime: string | null;
  eligible: boolean;
  reason: string | null;
  unlocksAt: string | null;
};

type ActiveHabit = {
  id: string;
  statement: string;
  action: string;
  cadence: string;
  scheduledTime: string;
  streak: number;
  cueLocation: string | null;
  stackAfter: string | null;
  mindsetReframe: string | null;
  immediateReward: string | null;
  groupId: string | null;
};

export default function Habits() {
  const { user } = useAuth();
  const tz = user?.timezone || "UTC";
  const dash = trpc.habits.dashboard.useQuery(undefined, { staleTime: 10_000 });
  const util = trpc.useUtils();
  const promote = trpc.habits.promoteBacklog.useMutation({
    onSuccess: () => util.habits.dashboard.invalidate(),
    onError: (e) => setGlobalErr(e.message),
  });
  const addBacklog = trpc.habits.addBacklog.useMutation({
    onSuccess: () => {
      util.habits.dashboard.invalidate();
      setShowAdd(false);
      resetForm();
    },
  });
  const archiveIdentity = trpc.identity.archive.useMutation({
    onSuccess: () => util.habits.dashboard.invalidate(),
  });
  const updateIdentity = trpc.identity.update.useMutation({
    onSuccess: () => util.habits.dashboard.invalidate(),
  });
  const deleteBacklog = trpc.habits.deleteBacklog.useMutation({
    onSuccess: () => util.habits.dashboard.invalidate(),
    onError: (e) => setGlobalErr(e.message),
  });
  const updateBacklog = trpc.habits.updateBacklog.useMutation({
    onSuccess: () => util.habits.dashboard.invalidate(),
    onError: (e) => setGlobalErr(e.message),
  });

  const [showAdd, setShowAdd] = useState(false);
  const [globalErr, setGlobalErr] = useState<string | null>(null);
  const [statement, setStatement] = useState("");
  const [action, setAction] = useState("");
  const [cadence, setCadence] = useState("daily");
  const [scheduledTime, setScheduledTime] = useState("09:00");

  function resetForm() {
    setStatement("");
    setAction("");
    setCadence("daily");
    setScheduledTime("09:00");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    addBacklog.mutate({
      statement: statement.trim(),
      action: action.trim(),
      cadence: cadence as Cadence,
      scheduledTime,
    });
  }

  const rule = dash.data?.rule;
  const stats = dash.data?.stats;
  const active = (dash.data?.active ?? []) as ActiveHabit[];

  return (
    <div className="px-5 pt-10 pb-6 lg:p-14 w-full max-w-[1180px] mx-auto">
      <header className="flex items-end justify-between gap-6 flex-wrap mb-6">
        <div>
          <div className="eyebrow">Habits</div>
          <h1 className="title-lg mt-2">The rule runs this.</h1>
        </div>
      </header>

      {rule && stats && (
        <div className="rule-banner">
          <div className="rule-left">
            <div className="label">Your rule</div>
            <div className="rule-text">{rule.text}</div>
          </div>
          <div className="rule-stats">
            <Stat
              k="Floor streak"
              v={`${stats.floor}d`}
              tone={stats.floor < rule.minimumStreak ? "red" : "teal"}
            />
            <Stat k="Active" v={`${stats.active}/${rule.maxActiveHabits}`} tone="teal" />
            <Stat
              k="Next slot"
              v={stats.monthlySlotLeft === 0 ? "Open" : `${stats.monthlySlotLeft}d`}
              tone={stats.monthlySlotLeft === 0 ? "teal" : undefined}
            />
          </div>
        </div>
      )}

      {globalErr && (
        <div
          className="card mt-6"
          style={{ background: "rgba(200,115,99,0.08)", borderColor: "rgba(200,115,99,0.3)" }}
        >
          <div className="body-sm" style={{ color: "var(--red)" }}>
            {globalErr}
          </div>
        </div>
      )}

      <RulesSection />

      <section className="mt-10">
        <div className="eyebrow">Active</div>
        <div className="mt-3">
          {active.map((h) => (
            <ActiveHabitRow
              key={h.id}
              h={h}
              tz={tz}
              minimumStreak={rule?.minimumStreak ?? 14}
              onArchive={() => archiveIdentity.mutate({ id: h.id })}
              onUpdate={(patch) => updateIdentity.mutate({ id: h.id, ...patch })}
            />
          ))}
          {active.length === 0 && (
            <p className="body-sm mt-2" style={{ color: "var(--ink-3)" }}>
              No active identities yet.
            </p>
          )}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex justify-between items-center">
          <div className="eyebrow">Backlog</div>
          <button className="btn btn-secondary" onClick={() => setShowAdd((s) => !s)}>
            <IconPlus /> Add future identity
          </button>
        </div>

        {showAdd && (
          <form
            onSubmit={onSubmit}
            className="card mt-4"
            style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
          >
            <input
              className="input"
              placeholder="I am a ____."
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              required
              style={{ flex: "1 1 260px" }}
            />
            <input
              className="input"
              placeholder="The daily action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              required
              style={{ flex: "1 1 260px" }}
            />
            <select
              className="input"
              value={cadence}
              onChange={(e) => setCadence(e.target.value)}
              style={{ width: 160 }}
            >
              {CADENCES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              className="input"
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              style={{ width: 130 }}
            />
            <button className="btn btn-primary" type="submit" disabled={addBacklog.isPending}>
              {addBacklog.isPending ? "Adding…" : "Add to backlog"}
            </button>
            <p
              className="body-sm"
              style={{ flex: "1 1 100%", color: "var(--ink-3)", fontSize: 11 }}
            >
              Add the cue, stack, reframe, and reward once it's promoted — right on the active card.
            </p>
          </form>
        )}

        <div className="mt-3">
          {dash.data?.backlog.map((b) => (
            <BacklogItem
              key={b.id}
              b={b}
              onPromote={() => promote.mutate({ id: b.id })}
              onDelete={() => {
                if (confirm(`Delete "${b.statement}"?`)) deleteBacklog.mutate({ id: b.id });
              }}
              onSave={(patch) => updateBacklog.mutate({ id: b.id, ...patch })}
              pending={promote.isPending}
            />
          ))}
          {dash.data && dash.data.backlog.length === 0 && (
            <div className="card mt-2">
              <div className="eyebrow eyebrow-teal">Empty</div>
              <h3 className="title-md mt-2">Nothing waiting.</h3>
              <p className="body-sm mt-2">Add a future identity when one comes to mind.</p>
            </div>
          )}
        </div>
      </section>

      <BadHabitsSection />
      <GroupsSection />
    </div>
  );
}

function ActiveHabitRow({
  h,
  tz,
  minimumStreak,
  onArchive,
  onUpdate,
}: {
  h: ActiveHabit;
  tz: string;
  minimumStreak: number;
  onArchive: () => void;
  onUpdate: (patch: {
    scheduledTime?: string;
    cueLocation?: string | null;
    stackAfter?: string | null;
    mindsetReframe?: string | null;
    immediateReward?: string | null;
    groupId?: string | null;
    action?: string;
    cadence?: Cadence;
  }) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const low = h.streak < minimumStreak;

  return (
    <div className="card" style={{ marginBottom: 10, padding: 14 }}>
      <div
        className="habit-row"
        style={{
          borderBottom: expanded ? "0.5px solid var(--line)" : "none",
          paddingBottom: expanded ? 10 : 0,
          marginBottom: expanded ? 10 : 0,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="stmt" style={{ fontSize: 17 }}>
            {h.statement}
          </div>
          <IntentionSentence h={h} />
        </div>
        <span className="chip">{h.cadence}</span>
        <input
          type="time"
          className="input"
          style={{ width: 110, padding: "6px 8px", fontSize: 13 }}
          defaultValue={h.scheduledTime}
          onBlur={(e) => {
            const v = e.target.value;
            if (/^\d{2}:\d{2}$/.test(v) && v !== h.scheduledTime) {
              onUpdate({ scheduledTime: v });
            }
          }}
          title={"Scheduled: " + formatScheduledTime(h.scheduledTime, tz, "long")}
        />
        <div className="flex items-center gap-2">
          <span className={"streak" + (low ? " low" : "")}>{h.streak}d</span>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 11 }}
            onClick={() => setExpanded((x) => !x)}
          >
            {expanded ? "Close" : "Edit"}
          </button>
          <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={onArchive}>
            Archive
          </button>
        </div>
      </div>
      {expanded && <IntentionFields h={h} onUpdate={onUpdate} />}
    </div>
  );
}

function IntentionSentence({ h }: { h: ActiveHabit }) {
  const parts: string[] = [];
  parts.push(`I will ${h.action}`);
  parts.push(cadenceWord(h.cadence));
  parts.push(`at ${h.scheduledTime}`);
  if (h.cueLocation) parts.push(`in ${h.cueLocation}`);
  return (
    <div
      className="act"
      style={{ fontSize: 12, marginTop: 3, color: "var(--ink-2)", lineHeight: 1.5 }}
    >
      {parts.join(" ")}.
      {h.stackAfter && (
        <div style={{ color: "var(--ink-3)", marginTop: 2 }}>After {h.stackAfter}.</div>
      )}
      {h.mindsetReframe && (
        <div style={{ color: "var(--ink-3)", marginTop: 2, fontStyle: "italic" }}>
          Because I get to {h.mindsetReframe}.
        </div>
      )}
    </div>
  );
}

function cadenceWord(c: string): string {
  const map = CADENCES.find((x) => x.key === c);
  if (!map) return c;
  return map.label.toLowerCase();
}

function IntentionFields({
  h,
  onUpdate,
}: {
  h: ActiveHabit;
  onUpdate: (patch: {
    action?: string;
    cadence?: Cadence;
    cueLocation?: string | null;
    stackAfter?: string | null;
    mindsetReframe?: string | null;
    immediateReward?: string | null;
    groupId?: string | null;
  }) => void;
}) {
  const [action, setAction] = useState(h.action);
  const [cadence, setCadence] = useState<Cadence>(h.cadence as Cadence);
  const [loc, setLoc] = useState(h.cueLocation ?? "");
  const [stack, setStack] = useState(h.stackAfter ?? "");
  const [reframe, setReframe] = useState(h.mindsetReframe ?? "");
  const [reward, setReward] = useState(h.immediateReward ?? "");
  const groups = trpc.groups.list.useQuery(undefined, { staleTime: 30_000 });
  const [groupId, setGroupId] = useState<string>(h.groupId ?? "");

  function save() {
    onUpdate({
      action: action.trim(),
      cadence,
      cueLocation: loc.trim() || null,
      stackAfter: stack.trim() || null,
      mindsetReframe: reframe.trim() || null,
      immediateReward: reward.trim() || null,
      groupId: groupId || null,
    });
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <LawField
        law="obvious"
        label="Action"
        helper={`I will ____ ${cadenceWord(cadence)} at ${h.scheduledTime}.`}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            className="input"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            style={{ flex: "1 1 220px" }}
          />
          <select
            className="input"
            value={cadence}
            onChange={(e) => setCadence(e.target.value as Cadence)}
            style={{ width: 160 }}
          >
            {CADENCES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Location — e.g. bedroom, desk"
            value={loc}
            onChange={(e) => setLoc(e.target.value)}
            style={{ flex: "1 1 220px" }}
          />
        </div>
      </LawField>

      <LawField law="easy" label="Habit stack" helper="After [existing habit], I will do this.">
        <input
          className="input"
          placeholder="After morning coffee…"
          value={stack}
          onChange={(e) => setStack(e.target.value)}
        />
        {!stack.trim() && (
          <p className="body-sm" style={{ color: "var(--ink-3)", fontSize: 11, marginTop: 4 }}>
            This habit has no anchor. Stack it onto something you already do.
          </p>
        )}
      </LawField>

      <LawField
        law="attractive"
        label="Mindset reframe"
        helper="Because I get to… — feeds the Today long-press."
      >
        <input
          className="input"
          placeholder="…feed my mind before sleep"
          value={reframe}
          onChange={(e) => setReframe(e.target.value)}
        />
      </LawField>

      <LawField
        law="satisfying"
        label="Immediate reward"
        helper="Small satisfying thing right after."
      >
        <input
          className="input"
          placeholder="Cup of tea, favorite song, one tally mark"
          value={reward}
          onChange={(e) => setReward(e.target.value)}
        />
      </LawField>

      <LawField
        law="attractive"
        label="My group"
        helper="The community that reinforces this identity."
      >
        <select className="input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          <option value="">— none —</option>
          {groups.data?.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </LawField>

      <div>
        <button className="btn btn-primary" onClick={save}>
          Save
        </button>
      </div>
    </div>
  );
}

function LawField({
  law,
  label,
  helper,
  children,
}: {
  law: "obvious" | "attractive" | "easy" | "satisfying";
  label: string;
  helper: string;
  children: React.ReactNode;
}) {
  const LawIcon =
    law === "obvious"
      ? IconEye
      : law === "attractive"
        ? IconHeart
        : law === "easy"
          ? IconFeather
          : IconCheckCircle;
  return (
    <div>
      <div
        className="eyebrow"
        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10 }}
      >
        <LawIcon size={12} />
        <span>
          {law} · {label}
        </span>
      </div>
      <p className="body-sm" style={{ color: "var(--ink-3)", fontSize: 11, margin: "4px 0 6px" }}>
        {helper}
      </p>
      {children}
    </div>
  );
}

function BadHabitsSection() {
  const util = trpc.useUtils();
  const list = trpc.badHabits.list.useQuery(undefined, { staleTime: 10_000 });
  const create = trpc.badHabits.create.useMutation({
    onSuccess: () => {
      util.badHabits.list.invalidate();
      setShowAdd(false);
      setName("");
    },
  });
  const update = trpc.badHabits.update.useMutation({
    onSuccess: () => util.badHabits.list.invalidate(),
  });
  const archive = trpc.badHabits.archive.useMutation({
    onSuccess: () => util.badHabits.list.invalidate(),
  });
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");

  return (
    <section className="mt-12">
      <div className="flex items-center justify-between">
        <div className="eyebrow" style={{ color: "var(--ink-3)" }}>
          Bad habits I'm weakening
        </div>
        <button className="btn btn-secondary" onClick={() => setShowAdd((s) => !s)}>
          <IconPlus /> Add bad habit
        </button>
      </div>
      <p className="body-sm mt-2" style={{ color: "var(--ink-3)", fontSize: 11 }}>
        Every identity has a competing bad habit. Name it, then apply the inverse laws.
      </p>

      {showAdd && (
        <form
          className="card mt-3"
          style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            create.mutate({ name: name.trim() });
          }}
        >
          <input
            className="input"
            placeholder="e.g. Late-night scrolling"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ flex: "1 1 260px" }}
          />
          <button className="btn btn-primary" type="submit" disabled={create.isPending}>
            {create.isPending ? "Adding…" : "Add"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>
            Cancel
          </button>
        </form>
      )}

      <div className="mt-3">
        {list.data?.map((b) => (
          <BadHabitCard
            key={b.id}
            b={b}
            onUpdate={(patch) => update.mutate({ id: b.id, ...patch })}
            onArchive={() => archive.mutate({ id: b.id })}
          />
        ))}
        {list.data && list.data.length === 0 && !showAdd && (
          <div className="mt-3">
            <EmptyState
              label="Nothing named yet"
              title="Every identity has a competing bad habit."
              body="What's the one that steals from your 5-to-9 hours?"
            />
          </div>
        )}
      </div>
    </section>
  );
}

function BadHabitCard({
  b,
  onUpdate,
  onArchive,
}: {
  b: {
    id: string;
    name: string;
    description: string | null;
    invisibleAction: string | null;
    unattractiveReframe: string | null;
    difficultAction: string | null;
    unsatisfyingConsequence: string | null;
  };
  onUpdate: (patch: {
    name?: string;
    invisibleAction?: string | null;
    unattractiveReframe?: string | null;
    difficultAction?: string | null;
    unsatisfyingConsequence?: string | null;
  }) => void;
  onArchive: () => void;
}) {
  const [invisible, setInvisible] = useState(b.invisibleAction ?? "");
  const [unattractive, setUnattractive] = useState(b.unattractiveReframe ?? "");
  const [difficult, setDifficult] = useState(b.difficultAction ?? "");
  const [unsatisfying, setUnsatisfying] = useState(b.unsatisfyingConsequence ?? "");
  const [name, setName] = useState(b.name);

  return (
    <div
      className="card"
      style={{
        marginBottom: 10,
        padding: 14,
        borderLeft: "3px solid var(--amber)",
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if (name.trim() && name !== b.name) onUpdate({ name: name.trim() });
          }}
          style={{ flex: 1, fontWeight: 500 }}
        />
        <button
          className="btn btn-ghost"
          style={{ fontSize: 11, color: "var(--red)" }}
          onClick={() => {
            if (confirm(`Archive "${b.name}"?`)) onArchive();
          }}
        >
          Archive
        </button>
      </div>
      <InverseRow
        icon={<IconEye size={12} />}
        law="Invisible"
        helper="How I removed the cue"
        value={invisible}
        onChange={setInvisible}
        onBlur={() => onUpdate({ invisibleAction: invisible.trim() || null })}
      />
      <InverseRow
        icon={<IconHeart size={12} />}
        law="Unattractive"
        helper="The cost I remind myself of"
        value={unattractive}
        onChange={setUnattractive}
        onBlur={() => onUpdate({ unattractiveReframe: unattractive.trim() || null })}
      />
      <InverseRow
        icon={<IconFeather size={12} />}
        law="Difficult"
        helper="The friction I added"
        value={difficult}
        onChange={setDifficult}
        onBlur={() => onUpdate({ difficultAction: difficult.trim() || null })}
      />
      <InverseRow
        icon={<IconCheckCircle size={12} />}
        law="Unsatisfying"
        helper="The commitment device"
        value={unsatisfying}
        onChange={setUnsatisfying}
        onBlur={() => onUpdate({ unsatisfyingConsequence: unsatisfying.trim() || null })}
      />
    </div>
  );
}

function InverseRow({
  icon,
  law,
  helper,
  value,
  onChange,
  onBlur,
}: {
  icon: React.ReactNode;
  law: string;
  helper: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
}) {
  return (
    <div style={{ marginTop: 6 }}>
      <div
        className="eyebrow"
        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, opacity: 0.8 }}
      >
        {icon}
        <span>
          {law} — {helper}
        </span>
      </div>
      <input
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        style={{ marginTop: 4 }}
      />
    </div>
  );
}

function GroupsSection() {
  const util = trpc.useUtils();
  const list = trpc.groups.list.useQuery(undefined, { staleTime: 30_000 });
  const create = trpc.groups.create.useMutation({
    onSuccess: () => {
      util.groups.list.invalidate();
      reset();
      setShowAdd(false);
    },
  });
  const update = trpc.groups.update.useMutation({
    onSuccess: () => util.groups.list.invalidate(),
  });
  const del = trpc.groups.delete.useMutation({
    onSuccess: () => util.groups.list.invalidate(),
  });

  const [showAdd, setShowAdd] = useState(false);
  const [ident, setIdent] = useState("");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");

  function reset() {
    setIdent("");
    setName("");
    setUrl("");
    setNote("");
  }

  return (
    <section className="mt-12">
      <div className="flex items-center justify-between">
        <div className="eyebrow">Groups</div>
        <button className="btn btn-secondary" onClick={() => setShowAdd((s) => !s)}>
          <IconPlus /> Add group
        </button>
      </div>
      <p className="body-sm mt-2" style={{ color: "var(--ink-3)", fontSize: 11 }}>
        You become the tribe you sit with. One group per identity you want to reinforce.
      </p>

      {showAdd && (
        <form
          className="card mt-3"
          style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
          onSubmit={(e) => {
            e.preventDefault();
            if (!ident.trim() || !name.trim()) return;
            create.mutate({
              identityItSupports: ident.trim(),
              name: name.trim(),
              urlOrContact: url.trim() || undefined,
              note: note.trim() || undefined,
            });
          }}
        >
          <input
            className="input"
            placeholder="Identity it supports — e.g. I am a trader"
            value={ident}
            onChange={(e) => setIdent(e.target.value)}
            required
            style={{ flex: "1 1 260px" }}
          />
          <input
            className="input"
            placeholder="Group name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ flex: "1 1 220px" }}
          />
          <input
            className="input"
            placeholder="URL or contact"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={{ flex: "1 1 220px" }}
          />
          <input
            className="input"
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ flex: "1 1 100%" }}
          />
          <button className="btn btn-primary" type="submit" disabled={create.isPending}>
            {create.isPending ? "Saving…" : "Save group"}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              reset();
              setShowAdd(false);
            }}
          >
            Cancel
          </button>
        </form>
      )}

      <div className="mt-3">
        {list.data?.map((g) => (
          <GroupRow
            key={g.id}
            g={g}
            onSave={(patch) => update.mutate({ id: g.id, ...patch })}
            onDelete={() => {
              if (confirm(`Delete group "${g.name}"?`)) del.mutate({ id: g.id });
            }}
          />
        ))}
        {list.data && list.data.length === 0 && !showAdd && (
          <div className="mt-3">
            <EmptyState
              label="No tribe yet"
              title="You don't belong to a community for this identity yet."
              body="The fastest way to become a reader / writer / trader is to be around people who already are."
            />
          </div>
        )}
      </div>
    </section>
  );
}

function GroupRow({
  g,
  onSave,
  onDelete,
}: {
  g: {
    id: string;
    identityItSupports: string;
    name: string;
    urlOrContact: string | null;
    note: string | null;
  };
  onSave: (patch: {
    identityItSupports?: string;
    name?: string;
    urlOrContact?: string | null;
    note?: string | null;
  }) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [ident, setIdent] = useState(g.identityItSupports);
  const [name, setName] = useState(g.name);
  const [url, setUrl] = useState(g.urlOrContact ?? "");
  const [note, setNote] = useState(g.note ?? "");

  if (editing) {
    return (
      <div className="card" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
        <input
          className="input"
          value={ident}
          onChange={(e) => setIdent(e.target.value)}
          style={{ flex: "1 1 260px" }}
        />
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ flex: "1 1 220px" }}
        />
        <input
          className="input"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="URL or contact"
          style={{ flex: "1 1 220px" }}
        />
        <input
          className="input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note"
          style={{ flex: "1 1 100%" }}
        />
        <button
          className="btn btn-primary"
          onClick={() => {
            onSave({
              identityItSupports: ident.trim(),
              name: name.trim(),
              urlOrContact: url.trim() || null,
              note: note.trim() || null,
            });
            setEditing(false);
          }}
        >
          Save
        </button>
        <button className="btn btn-ghost" onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div
      className="card"
      style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 8 }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{g.name}</div>
        <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>
          Supports: {g.identityItSupports}
        </div>
        {g.urlOrContact && (
          <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>{g.urlOrContact}</div>
        )}
        {g.note && (
          <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>{g.note}</div>
        )}
      </div>
      <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => setEditing(true)}>
        Edit
      </button>
      <button
        className="btn btn-ghost"
        style={{ fontSize: 11, color: "var(--red)" }}
        onClick={onDelete}
      >
        Delete
      </button>
    </div>
  );
}

function RulesSection() {
  const util = trpc.useUtils();
  const list = trpc.rules.list.useQuery(undefined, { staleTime: 10_000 });
  const create = trpc.rules.create.useMutation({
    onSuccess: () => util.rules.list.invalidate(),
  });
  const update = trpc.rules.update.useMutation({
    onSuccess: () => util.rules.list.invalidate(),
  });
  const del = trpc.rules.delete.useMutation({
    onSuccess: () => util.rules.list.invalidate(),
  });

  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [cad, setCad] = useState<Cadence | "">("");
  const [time, setTime] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  function reset() {
    setTitle("");
    setDesc("");
    setCad("");
    setTime("");
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <div className="eyebrow">Rules</div>
        <button className="btn btn-secondary" onClick={() => setShowAdd((s) => !s)}>
          <IconPlus /> Add rule
        </button>
      </div>
      <p className="body-sm mt-2" style={{ color: "var(--ink-3)", fontSize: 11 }}>
        Forgot one in onboarding? Add here. Cadence + time optional — leave blank for a pure rule.
      </p>

      {showAdd && (
        <form
          className="card mt-3"
          style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            create.mutate(
              {
                text: title.trim(),
                description: desc.trim() || undefined,
                cadence: (cad || undefined) as Cadence | undefined,
                scheduledTime: time || undefined,
              },
              {
                onSuccess: () => {
                  reset();
                  setShowAdd(false);
                },
              },
            );
          }}
        >
          <input
            className="input"
            placeholder="Title — e.g. No phone before 10am"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={{ flex: "1 1 100%" }}
          />
          <textarea
            className="input"
            placeholder="Description (optional)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={2}
            style={{ flex: "1 1 100%" }}
          />
          <select
            className="input"
            value={cad}
            onChange={(e) => setCad(e.target.value as Cadence | "")}
            style={{ width: 180 }}
          >
            <option value="">No cadence</option>
            {CADENCES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            className="input"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            style={{ width: 130 }}
          />
          <button className="btn btn-primary" type="submit" disabled={create.isPending}>
            {create.isPending ? "Adding…" : "Save rule"}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              reset();
              setShowAdd(false);
            }}
          >
            Cancel
          </button>
        </form>
      )}

      <div className="mt-3">
        {list.data?.map((r) =>
          editingId === r.id ? (
            <RuleEditRow
              key={r.id}
              r={r}
              onSave={(patch) => {
                update.mutate({ id: r.id, ...patch }, { onSuccess: () => setEditingId(null) });
              }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <RuleRow
              key={r.id}
              r={r}
              onEdit={() => setEditingId(r.id)}
              onDelete={() => {
                if (confirm("Delete this rule?")) del.mutate({ id: r.id });
              }}
            />
          ),
        )}
        {list.data && list.data.length === 0 && !showAdd && (
          <p className="body-sm" style={{ color: "var(--ink-3)", marginTop: 6 }}>
            No extra rules yet.
          </p>
        )}
      </div>
    </section>
  );
}

type RuleRowData = {
  id: string;
  text: string;
  description: string | null;
  cadence: string | null;
  scheduledTime: string | null;
};

function RuleRow({
  r,
  onEdit,
  onDelete,
}: {
  r: RuleRowData;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="card"
      style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 8 }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: "var(--ink)" }}>{r.text}</div>
        {r.description && (
          <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 4 }}>{r.description}</div>
        )}
        {(r.cadence || r.scheduledTime) && (
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            {r.cadence && <span className="chip">{r.cadence}</span>}
            {r.scheduledTime && <span className="chip">{r.scheduledTime}</span>}
          </div>
        )}
      </div>
      <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={onEdit}>
        Edit
      </button>
      <button
        className="btn btn-ghost"
        style={{ fontSize: 11, color: "var(--red)" }}
        onClick={onDelete}
      >
        Delete
      </button>
    </div>
  );
}

function RuleEditRow({
  r,
  onSave,
  onCancel,
}: {
  r: RuleRowData;
  onSave: (patch: {
    text: string;
    description: string | null;
    cadence: Cadence | null;
    scheduledTime: string | null;
  }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(r.text);
  const [desc, setDesc] = useState(r.description ?? "");
  const [cad, setCad] = useState<Cadence | "">((r.cadence as Cadence | null) ?? "");
  const [time, setTime] = useState(r.scheduledTime ?? "");

  return (
    <div className="card" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
      <input
        className="input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ flex: "1 1 100%" }}
      />
      <textarea
        className="input"
        placeholder="Description (optional)"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        rows={2}
        style={{ flex: "1 1 100%" }}
      />
      <select
        className="input"
        value={cad}
        onChange={(e) => setCad(e.target.value as Cadence | "")}
        style={{ width: 180 }}
      >
        <option value="">No cadence</option>
        {CADENCES.map((c) => (
          <option key={c.key} value={c.key}>
            {c.label}
          </option>
        ))}
      </select>
      <input
        className="input"
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        style={{ width: 130 }}
      />
      <button
        className="btn btn-primary"
        onClick={() => {
          if (!title.trim()) return;
          onSave({
            text: title.trim(),
            description: desc.trim() ? desc.trim() : null,
            cadence: cad || null,
            scheduledTime: time || null,
          });
        }}
      >
        Save
      </button>
      <button className="btn btn-ghost" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}

function Stat({ k, v, tone }: { k: string; v: string; tone?: "teal" | "red" }) {
  const cls = "rule-stat" + (tone === "teal" ? " teal" : tone === "red" ? " red" : "");
  return (
    <div className={cls}>
      <div className="k">{k}</div>
      <div className="v">{v}</div>
    </div>
  );
}

function BacklogItem({
  b,
  onPromote,
  onDelete,
  onSave,
  pending,
}: {
  b: BacklogRow;
  onPromote: () => void;
  onDelete: () => void;
  onSave: (patch: {
    statement?: string;
    action?: string;
    cadence?: Cadence;
    scheduledTime?: string;
  }) => void;
  pending: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [statement, setStatement] = useState(b.statement);
  const [action, setAction] = useState(b.action);
  const [cadence, setCadence] = useState<Cadence>(b.cadence as Cadence);
  const [scheduledTime, setScheduledTime] = useState(b.scheduledTime ?? "09:00");

  if (editing) {
    return (
      <div className="backlog-row" style={{ flexWrap: "wrap", gap: 8 }}>
        <input
          className="input"
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          style={{ flex: "1 1 240px" }}
        />
        <input
          className="input"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          style={{ flex: "1 1 240px" }}
        />
        <select
          className="input"
          value={cadence}
          onChange={(e) => setCadence(e.target.value as Cadence)}
          style={{ width: 150 }}
        >
          {CADENCES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          className="input"
          type="time"
          value={scheduledTime}
          onChange={(e) => setScheduledTime(e.target.value)}
          style={{ width: 120 }}
        />
        <button
          className="btn btn-primary"
          onClick={() => {
            onSave({
              statement: statement.trim(),
              action: action.trim(),
              cadence,
              scheduledTime,
            });
            setEditing(false);
          }}
        >
          Save
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => {
            setStatement(b.statement);
            setAction(b.action);
            setCadence(b.cadence as Cadence);
            setScheduledTime(b.scheduledTime ?? "09:00");
            setEditing(false);
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="backlog-row">
      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
        <div className="stmt" style={{ fontSize: 16 }}>
          {b.statement}
        </div>
        <div className="act" style={{ fontSize: 12, color: "var(--ink-3)" }}>
          {b.action}
        </div>
      </div>
      <span className="chip">{b.cadence}</span>
      {b.eligible ? (
        <button className="btn btn-primary" onClick={onPromote} disabled={pending}>
          Unlock
        </button>
      ) : (
        <span className="lock" title={b.reason ?? ""}>
          <IconLock size={10} /> {b.reason ? b.reason : "Locked"}
        </span>
      )}
      <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => setEditing(true)}>
        Edit
      </button>
      <button
        className="btn btn-ghost"
        style={{ fontSize: 11, color: "var(--red)" }}
        onClick={onDelete}
      >
        Delete
      </button>
    </div>
  );
}
