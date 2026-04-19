import { useState, type FormEvent } from "react";
import { trpc } from "../../trpc";
import { IconLock, IconPlus } from "../../components/icons";
import { CADENCES } from "../../../shared/constants";
import { formatScheduledTime } from "../../hooks/useTodayDate";
import { useAuth } from "../../providers/auth";

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
      cadence: cadence as "daily" | "weekdays" | "5x_week" | "weekends" | "custom",
      scheduledTime,
    });
  }

  const rule = dash.data?.rule;
  const stats = dash.data?.stats;

  return (
    <div className="px-5 pt-10 pb-6 lg:p-14 max-w-[1180px]">
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

      <section className="mt-10">
        <div className="eyebrow">Active</div>
        <div className="mt-3">
          {dash.data?.active.map((h) => {
            const low = rule && h.streak < rule.minimumStreak;
            return (
              <div key={h.id} className="habit-row">
                <div>
                  <div className="stmt" style={{ fontSize: 17 }}>
                    {h.statement}
                  </div>
                  <div
                    className="act"
                    style={{ fontSize: 12, marginTop: 3, color: "var(--ink-2)" }}
                  >
                    {h.action}
                  </div>
                </div>
                <span className="chip">{h.cadence}</span>
                <span className="time">{formatScheduledTime(h.scheduledTime, tz, "long")}</span>
                <div className="flex items-center gap-2">
                  <span className={"streak" + (low ? " low" : "")}>{h.streak}d</span>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 11 }}
                    onClick={() => archiveIdentity.mutate({ id: h.id })}
                  >
                    Archive
                  </button>
                </div>
              </div>
            );
          })}
          {dash.data && dash.data.active.length === 0 && (
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
          </form>
        )}

        <div className="mt-3">
          {dash.data?.backlog.map((b) => (
            <BacklogItem
              key={b.id}
              b={b}
              onPromote={() => promote.mutate({ id: b.id })}
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
  pending,
}: {
  b: BacklogRow;
  onPromote: () => void;
  pending: boolean;
}) {
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
    </div>
  );
}
