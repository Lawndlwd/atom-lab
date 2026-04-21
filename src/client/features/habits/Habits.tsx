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
import { stripLead } from "../../../shared/text";
import { formatScheduledTime } from "../../hooks/useTodayDate";
import { useAuth } from "../../providers/auth";
import { EmptyState } from "../../components/EmptyState";
import { KebabMenu } from "../../components/KebabMenu";
import { SectionDivider } from "../../components/SectionDivider";

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
    <div className="px-5 pt-10 pb-6 lg:p-14 w-full max-w-[1440px] mx-auto">
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

      <div className="habits-layout">
        <div>
          <SectionDivider label="Habits — the laws I live by" />
          <ActiveHabitsSection
            active={active}
            tz={tz}
            minimumStreak={rule?.minimumStreak ?? 14}
            onArchive={(id) => archiveIdentity.mutate({ id })}
            onUpdate={(id, patch) => updateIdentity.mutate({ id, ...patch })}
          />

          <SectionDivider label="Backlog — waiting in the wings" />
          <section>
            <div className="flex justify-between items-center">
              <div className="eyebrow">Backlog</div>
              <button className="btn btn-accent" onClick={() => setShowAdd((s) => !s)}>
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
                  Add the cue, stack, reframe, and reward once it's promoted — right on the active
                  card.
                </p>
              </form>
            )}

            <div className="habit-grid mt-3">
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
            </div>
            {dash.data && dash.data.backlog.length === 0 && (
              <div className="card mt-3">
                <div className="eyebrow eyebrow-teal">Empty</div>
                <h3 className="title-md mt-2">Nothing waiting.</h3>
                <p className="body-sm mt-2">Add a future identity when one comes to mind.</p>
              </div>
            )}
          </section>

          <SectionDivider label="Bad habits — the inverse laws" />
          <BadHabitsSection />
        </div>
        <aside style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SectionDivider label="Rules" />
          <RulesSection sidebar />
          <SectionDivider label="Community" />
          <GroupsSection sidebar />
        </aside>
      </div>
    </div>
  );
}

type UpdateIdentityPatch = {
  scheduledTime?: string;
  cueLocation?: string | null;
  stackAfter?: string | null;
  mindsetReframe?: string | null;
  immediateReward?: string | null;
  groupId?: string | null;
  action?: string;
  cadence?: Cadence;
};

function ActiveHabitsSection({
  active,
  tz,
  minimumStreak,
  onArchive,
  onUpdate,
}: {
  active: ActiveHabit[];
  tz: string;
  minimumStreak: number;
  onArchive: (id: string) => void;
  onUpdate: (id: string, patch: UpdateIdentityPatch) => void;
}) {
  const util = trpc.useUtils();
  const [tab, setTab] = useState<"active" | "archived">("active");
  const archivedQuery = trpc.identity.listAll.useQuery(undefined, { staleTime: 10_000 });
  const unarchive = trpc.identity.unarchive.useMutation({
    onSuccess: () => {
      util.identity.listAll.invalidate();
      util.habits.dashboard.invalidate();
    },
  });
  const archivedList = (archivedQuery.data ?? []).filter((i) => i.status === "archived");

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="eyebrow">Habits</div>
        <TabBar
          tab={tab}
          setTab={setTab}
          counts={{ active: active.length, archived: archivedList.length }}
        />
      </div>
      <div className="mt-4">
        {tab === "active" ? (
          <>
            <div className="habit-grid">
              {active.map((h) => (
                <ActiveHabitRow
                  key={h.id}
                  h={h}
                  tz={tz}
                  minimumStreak={minimumStreak}
                  onArchive={() => onArchive(h.id)}
                  onUpdate={(patch) => onUpdate(h.id, patch)}
                />
              ))}
            </div>
            {active.length === 0 && (
              <p className="body-sm mt-2" style={{ color: "var(--ink-3)" }}>
                No active identities yet.
              </p>
            )}
          </>
        ) : (
          <div className="habit-grid">
            {archivedList.map((h) => (
              <div
                key={h.id}
                className="card kebab-host"
                style={{
                  padding: 16,
                  paddingRight: 44,
                  opacity: 0.7,
                  borderLeft: "3px solid var(--ink-4)",
                }}
              >
                <KebabMenu
                  actions={[
                    {
                      label: "Restore",
                      tone: "teal",
                      onClick: () => unarchive.mutate({ id: h.id }),
                    },
                  ]}
                />
                <div className="habit-card-head">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="title">{h.statement}</div>
                    <div className="sub">{h.action}</div>
                  </div>
                </div>
              </div>
            ))}
            {archivedList.length === 0 && (
              <p className="body-sm" style={{ color: "var(--ink-3)" }}>
                No archived habits.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
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
  const obvious = `I will ${h.action} ${cadenceWord(h.cadence)} at ${formatScheduledTime(h.scheduledTime, tz, "short")}${h.cueLocation ? ` in ${h.cueLocation}` : ""}.`;

  return (
    <div
      className="card kebab-host"
      style={{ padding: 20, paddingRight: 44, borderLeft: "3px solid var(--teal)" }}
    >
      <KebabMenu
        actions={[
          {
            label: expanded ? "Close" : "Edit",
            onClick: () => setExpanded((x) => !x),
          },
          {
            label: "Archive",
            tone: "red",
            onClick: () => {
              if (confirm(`Archive "${h.statement}"?`)) onArchive();
            },
          },
        ]}
      />
      <div className="habit-card-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="title" style={{ color: "var(--teal)" }}>
            {h.statement}
          </div>
          <div className="sub">
            <span className={"streak" + (low ? " low" : "")}>{h.streak}d</span>
            <span style={{ margin: "0 8px", opacity: 0.5 }}>·</span>
            {h.cadence} · {h.scheduledTime}
          </div>
        </div>
      </div>

      {expanded ? (
        <IntentionFields h={h} onUpdate={onUpdate} />
      ) : (
        <div className="law-grid">
          <LawDisplayRow icon={<IconEye size={13} />} law="Obvious" value={obvious} />
          <LawDisplayRow
            icon={<IconHeart size={13} />}
            law="Attractive"
            value={
              h.mindsetReframe
                ? `Because I get to ${stripLead(h.mindsetReframe, ["because i get to", "because"])}.`
                : null
            }
          />
          <LawDisplayRow
            icon={<IconFeather size={13} />}
            law="Easy"
            value={h.stackAfter ? `After ${stripLead(h.stackAfter, ["after"])}.` : null}
          />
          <LawDisplayRow
            icon={<IconCheckCircle size={13} />}
            law="Satisfying"
            value={h.immediateReward}
          />
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
    <div>
      <div className="law-grid">
        <div className="law-row">
          <div className="law-k" title="I will ____ at [time].">
            <IconEye size={13} />
            <span>Obvious</span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              className="input"
              value={action}
              placeholder="Action — e.g. read one page"
              onChange={(e) => setAction(e.target.value)}
              style={{ flex: "1 1 220px", padding: "8px 10px", fontSize: 13.5 }}
            />
            <select
              className="input"
              value={cadence}
              onChange={(e) => setCadence(e.target.value as Cadence)}
              style={{ width: 150, padding: "8px 10px", fontSize: 13.5 }}
            >
              {CADENCES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              className="input"
              placeholder="Location — bedroom, desk…"
              value={loc}
              onChange={(e) => setLoc(e.target.value)}
              style={{ flex: "1 1 180px", padding: "8px 10px", fontSize: 13.5 }}
            />
          </div>
        </div>
        <LawEditRow
          icon={<IconHeart size={13} />}
          law="Attractive"
          helper="Because I get to… — feeds the Today long-press."
          value={reframe}
          onChange={setReframe}
        />
        <LawEditRow
          icon={<IconFeather size={13} />}
          law="Easy"
          helper="After [existing habit]…"
          value={stack}
          onChange={setStack}
        />
        <LawEditRow
          icon={<IconCheckCircle size={13} />}
          law="Satisfying"
          helper="Cup of tea, favorite song, one tally mark"
          value={reward}
          onChange={setReward}
        />
        <div className="law-row">
          <div className="law-k">
            <IconHeart size={13} />
            <span>Group</span>
          </div>
          <select
            className="input"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            style={{ padding: "8px 10px", fontSize: 13.5 }}
          >
            <option value="">— none —</option>
            {groups.data?.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <button className="btn btn-primary" onClick={save}>
          Save
        </button>
      </div>
    </div>
  );
}

function BadHabitsSection() {
  const util = trpc.useUtils();
  const [tab, setTab] = useState<"active" | "archived">("active");
  const active = trpc.badHabits.list.useQuery({ status: "active" }, { staleTime: 10_000 });
  const archived = trpc.badHabits.list.useQuery({ status: "archived" }, { staleTime: 10_000 });
  const invalidate = () => {
    util.badHabits.list.invalidate();
  };
  const create = trpc.badHabits.create.useMutation({
    onSuccess: () => {
      invalidate();
      setShowAdd(false);
      setName("");
    },
  });
  const update = trpc.badHabits.update.useMutation({ onSuccess: invalidate });
  const archive = trpc.badHabits.archive.useMutation({ onSuccess: invalidate });
  const unarchive = trpc.badHabits.unarchive.useMutation({ onSuccess: invalidate });
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");

  const list = tab === "active" ? active.data : archived.data;

  return (
    <section className="mt-12">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="eyebrow" style={{ color: "var(--ink-3)" }}>
          Bad habits I'm weakening
        </div>
        <div className="flex items-center gap-2">
          <TabBar
            tab={tab}
            setTab={setTab}
            counts={{ active: active.data?.length ?? 0, archived: archived.data?.length ?? 0 }}
          />
          <button className="btn btn-accent" onClick={() => setShowAdd((s) => !s)}>
            <IconPlus /> Add bad habit
          </button>
        </div>
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

      <div className="habit-grid mt-4">
        {list?.map((b) => (
          <BadHabitCard
            key={b.id}
            b={b}
            archived={tab === "archived"}
            onUpdate={(patch) => update.mutate({ id: b.id, ...patch })}
            onArchive={() => archive.mutate({ id: b.id })}
            onUnarchive={() => unarchive.mutate({ id: b.id })}
          />
        ))}
      </div>
      {list && list.length === 0 && !showAdd && tab === "active" && (
        <div className="mt-3">
          <EmptyState
            label="Nothing named yet"
            title="Every identity has a competing bad habit."
            body="What's the one that steals from your 5-to-9 hours?"
          />
        </div>
      )}
      {list && list.length === 0 && tab === "archived" && (
        <p className="body-sm mt-4" style={{ color: "var(--ink-3)" }}>
          No archived bad habits.
        </p>
      )}
    </section>
  );
}

function TabBar({
  tab,
  setTab,
  counts,
}: {
  tab: "active" | "archived";
  setTab: (t: "active" | "archived") => void;
  counts: { active: number; archived: number };
}) {
  return (
    <div className="tab-bar">
      <button
        className={"tab" + (tab === "active" ? " active" : "")}
        onClick={() => setTab("active")}
      >
        Active<span className="count">{counts.active}</span>
      </button>
      <button
        className={"tab" + (tab === "archived" ? " active" : "")}
        onClick={() => setTab("archived")}
      >
        Archived<span className="count">{counts.archived}</span>
      </button>
    </div>
  );
}

function BadHabitCard({
  b,
  archived,
  onUpdate,
  onArchive,
  onUnarchive,
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
  archived: boolean;
  onUpdate: (patch: {
    name?: string;
    description?: string | null;
    invisibleAction?: string | null;
    unattractiveReframe?: string | null;
    difficultAction?: string | null;
    unsatisfyingConsequence?: string | null;
  }) => void;
  onArchive: () => void;
  onUnarchive: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(b.name);
  const [desc, setDesc] = useState(b.description ?? "");
  const [invisible, setInvisible] = useState(b.invisibleAction ?? "");
  const [unattractive, setUnattractive] = useState(b.unattractiveReframe ?? "");
  const [difficult, setDifficult] = useState(b.difficultAction ?? "");
  const [unsatisfying, setUnsatisfying] = useState(b.unsatisfyingConsequence ?? "");

  function save() {
    onUpdate({
      name: name.trim(),
      description: desc.trim() || null,
      invisibleAction: invisible.trim() || null,
      unattractiveReframe: unattractive.trim() || null,
      difficultAction: difficult.trim() || null,
      unsatisfyingConsequence: unsatisfying.trim() || null,
    });
    setEditing(false);
  }

  return (
    <div
      className="card kebab-host"
      style={{
        padding: 20,
        paddingRight: 44,
        borderLeft: "3px solid var(--red)",
        opacity: archived ? 0.65 : 1,
      }}
    >
      {!editing && (
        <KebabMenu
          actions={
            archived
              ? [{ label: "Restore", tone: "teal", onClick: onUnarchive }]
              : [
                  { label: "Edit", onClick: () => setEditing(true) },
                  {
                    label: "Archive",
                    tone: "red",
                    onClick: () => {
                      if (confirm(`Archive "${b.name}"?`)) onArchive();
                    },
                  },
                ]
          }
        />
      )}
      <div className="habit-card-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ fontWeight: 500 }}
            />
          ) : (
            <div className="title red">{b.name}</div>
          )}
          {editing ? (
            <input
              className="input"
              placeholder="Competes with… / context"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              style={{ marginTop: 8 }}
            />
          ) : (
            b.description && <div className="sub">{b.description}</div>
          )}
        </div>
        {editing && (
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button
              className="btn btn-primary"
              style={{ fontSize: 12, padding: "6px 12px" }}
              onClick={save}
            >
              Save
            </button>
            <button
              className="btn btn-ghost"
              style={{ fontSize: 11 }}
              onClick={() => {
                setName(b.name);
                setDesc(b.description ?? "");
                setInvisible(b.invisibleAction ?? "");
                setUnattractive(b.unattractiveReframe ?? "");
                setDifficult(b.difficultAction ?? "");
                setUnsatisfying(b.unsatisfyingConsequence ?? "");
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="law-grid">
        {editing ? (
          <>
            <LawEditRow
              icon={<IconEye size={13} />}
              law="Invisible"
              helper="How I removed the cue"
              value={invisible}
              onChange={setInvisible}
            />
            <LawEditRow
              icon={<IconHeart size={13} />}
              law="Unattractive"
              helper="The cost I remind myself of"
              value={unattractive}
              onChange={setUnattractive}
            />
            <LawEditRow
              icon={<IconFeather size={13} />}
              law="Difficult"
              helper="The friction I added"
              value={difficult}
              onChange={setDifficult}
            />
            <LawEditRow
              icon={<IconCheckCircle size={13} />}
              law="Unsatisfying"
              helper="The commitment device"
              value={unsatisfying}
              onChange={setUnsatisfying}
            />
          </>
        ) : (
          <>
            <LawDisplayRow icon={<IconEye size={13} />} law="Invisible" value={b.invisibleAction} />
            <LawDisplayRow
              icon={<IconHeart size={13} />}
              law="Unattractive"
              value={b.unattractiveReframe}
            />
            <LawDisplayRow
              icon={<IconFeather size={13} />}
              law="Difficult"
              value={b.difficultAction}
            />
            <LawDisplayRow
              icon={<IconCheckCircle size={13} />}
              law="Unsatisfying"
              value={b.unsatisfyingConsequence}
            />
          </>
        )}
      </div>
    </div>
  );
}

function LawDisplayRow({
  icon,
  law,
  value,
}: {
  icon: React.ReactNode;
  law: string;
  value: string | null;
}) {
  return (
    <div className="law-row">
      <div className="law-k">
        {icon}
        <span>{law}</span>
      </div>
      <div className={"law-v" + (value ? "" : " empty")}>{value || "—"}</div>
    </div>
  );
}

function LawEditRow({
  icon,
  law,
  helper,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  law: string;
  helper: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="law-row">
      <div className="law-k" title={helper}>
        {icon}
        <span>{law}</span>
      </div>
      <input
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={helper}
        style={{ padding: "8px 10px", fontSize: 13.5 }}
      />
    </div>
  );
}

function GroupsSection({ sidebar = false }: { sidebar?: boolean }) {
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
    <section className={sidebar ? "" : "mt-12"}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="eyebrow">{sidebar ? "Groups · Community" : "Groups"}</div>
        <button
          className="btn btn-accent"
          style={sidebar ? { fontSize: 12 } : undefined}
          onClick={() => setShowAdd((s) => !s)}
        >
          <IconPlus /> Add
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

      <div className={"habit-grid mt-3" + (sidebar ? " stack" : " wide-3")}>
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
      </div>
      {list.data && list.data.length === 0 && !showAdd && (
        <div className="mt-3">
          <EmptyState
            label="No tribe yet"
            title="You don't belong to a community for this identity yet."
            body="The fastest way to become a reader / writer / trader is to be around people who already are."
          />
        </div>
      )}
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
      <div className="card" style={{ padding: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          className="input"
          value={ident}
          onChange={(e) => setIdent(e.target.value)}
          placeholder="Identity it supports"
          style={{ flex: "1 1 100%" }}
        />
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Group name"
          style={{ flex: "1 1 100%" }}
        />
        <input
          className="input"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="URL or contact"
          style={{ flex: "1 1 100%" }}
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
      className="card kebab-host"
      style={{
        padding: 14,
        paddingRight: 44,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <KebabMenu
        actions={[
          { label: "Edit", onClick: () => setEditing(true) },
          { label: "Delete", tone: "red", onClick: onDelete },
        ]}
      />
      <div style={{ minWidth: 0 }}>
        <div className="eyebrow" style={{ fontSize: 10, color: "var(--teal)", marginBottom: 2 }}>
          {g.identityItSupports}
        </div>
        <div className="title-sm" style={{ fontSize: 17 }}>
          {g.name}
        </div>
        {g.urlOrContact && (
          <div
            style={{
              fontSize: 11,
              color: "var(--ink-3)",
              marginTop: 4,
              fontFamily: "Geist Mono, monospace",
              wordBreak: "break-all",
            }}
          >
            {g.urlOrContact}
          </div>
        )}
        {g.note && (
          <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 6, lineHeight: 1.4 }}>
            {g.note}
          </div>
        )}
      </div>
    </div>
  );
}

function RulesSection({ sidebar = false }: { sidebar?: boolean }) {
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
    <section className={sidebar ? "" : "mt-8"}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="eyebrow">Rules</div>
        <button
          className="btn btn-accent"
          style={sidebar ? { fontSize: 12 } : undefined}
          onClick={() => setShowAdd((s) => !s)}
        >
          <IconPlus /> Add
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

      <div className={"habit-grid mt-3" + (sidebar ? " stack" : " wide-3")}>
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
      </div>
      {list.data && list.data.length === 0 && !showAdd && (
        <p className="body-sm" style={{ color: "var(--ink-3)", marginTop: 6 }}>
          No extra rules yet.
        </p>
      )}
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
      className="card kebab-host"
      style={{
        padding: 14,
        paddingRight: 44,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <KebabMenu
        actions={[
          { label: "Edit", onClick: onEdit },
          { label: "Delete", tone: "red", onClick: onDelete },
        ]}
      />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.35 }}>{r.text}</div>
        {r.description && (
          <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 4, lineHeight: 1.4 }}>
            {r.description}
          </div>
        )}
      </div>
      {(r.cadence || r.scheduledTime) && (
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {r.cadence && <span className="chip">{r.cadence}</span>}
          {r.scheduledTime && <span className="chip">{r.scheduledTime}</span>}
        </div>
      )}
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
    <div className="card" style={{ padding: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
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
        style={{ flex: "1 1 120px" }}
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
        style={{ flex: "1 1 100px" }}
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
      <div className="card" style={{ padding: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          className="input"
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          style={{ flex: "1 1 100%" }}
        />
        <input
          className="input"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          style={{ flex: "1 1 100%" }}
        />
        <select
          className="input"
          value={cadence}
          onChange={(e) => setCadence(e.target.value as Cadence)}
          style={{ flex: "1 1 130px" }}
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
          style={{ flex: "1 1 100px" }}
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
    <div
      className="card kebab-host"
      style={{
        padding: 14,
        paddingRight: 44,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <KebabMenu
        actions={[
          { label: "Edit", onClick: () => setEditing(true) },
          { label: "Delete", tone: "red", onClick: onDelete },
        ]}
      />
      <div style={{ minWidth: 0 }}>
        <div className="stmt" style={{ fontSize: 15 }}>
          {b.statement}
        </div>
        <div className="act" style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
          {b.action}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span className="chip">{b.cadence}</span>
        {b.scheduledTime && <span className="chip">{b.scheduledTime}</span>}
        <div style={{ flex: 1 }} />
        {b.eligible ? (
          <button className="btn btn-primary" onClick={onPromote} disabled={pending}>
            Unlock
          </button>
        ) : (
          <span className="lock" title={b.reason ?? ""}>
            <IconLock size={10} /> {b.reason ? b.reason : "Locked"}
          </span>
        )}
      </div>
    </div>
  );
}
