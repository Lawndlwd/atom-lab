import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { trpc } from "../../trpc";
import { Ring } from "../../components/Ring";
import { IconCheck } from "../../components/icons";
import { useTodayDate, formatScheduledTime } from "../../hooks/useTodayDate";
import { EmptyState } from "../../components/EmptyState";

type Row = {
  id: string;
  statement: string;
  action: string;
  scheduledTime: string;
  cadence: string;
  done: boolean;
  partial: boolean;
  streak: number;
  mindsetReframe: string | null;
  immediateReward: string | null;
  stackAfter: string | null;
  cueLocation: string | null;
  groupId: string | null;
};

export default function Today() {
  const { date, pretty, prettyLong, week, tz } = useTodayDate();
  const util = trpc.useUtils();
  const list = trpc.vote.list.useQuery({ date }, { staleTime: 10_000 });
  const groups = trpc.groups.list.useQuery(undefined, { staleTime: 30_000 });
  const badHabits = trpc.badHabits.listByDate.useQuery({ date }, { staleTime: 10_000 });

  const toggle = trpc.vote.toggle.useMutation({
    onMutate: async ({ identityId, done }) => {
      await util.vote.list.cancel({ date });
      const prev = util.vote.list.getData({ date });
      util.vote.list.setData({ date }, (cur) => {
        if (!cur) return cur;
        return {
          ...cur,
          rows: cur.rows.map((r) =>
            r.id === identityId
              ? {
                  ...r,
                  done: done ?? !r.done,
                  partial: false,
                  streak: r.done ? Math.max(0, r.streak - 1) : r.streak + 1,
                }
              : r,
          ),
        };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) util.vote.list.setData({ date }, ctx.prev);
    },
    onSettled: () => util.vote.list.invalidate({ date }),
  });

  const toggleBadHabit = trpc.badHabits.toggleLog.useMutation({
    onSuccess: () => util.badHabits.listByDate.invalidate({ date }),
  });

  const rows = (list.data?.rows ?? []) as Row[];
  const doneCount = rows.filter((r) => r.done).length;
  const total = rows.length;

  const firstIncomplete = rows.findIndex((r) => !r.done);
  const groupById = new Map((groups.data ?? []).map((g) => [g.id, g]));
  const badRows = badHabits.data ?? [];
  const cleanCount = badRows.filter((b) => b.weakened).length;

  return (
    <div className="px-5 pt-10 pb-6 lg:p-14 w-full max-w-[1180px] mx-auto">
      <header>
        <div className="eyebrow">
          <span className="hidden lg:inline">{prettyLong}</span>
          <span className="lg:hidden">{pretty}</span>
          <span> · Week {week}</span>
        </div>
        <h1 className="title-lg mt-2">Today, in order.</h1>
        <TodayCounter
          done={doneCount}
          total={total}
          cleanCount={cleanCount}
          cleanTotal={badRows.length}
        />
      </header>

      {list.isPending && <div className="body-sm mt-10">Loading…</div>}
      {list.isError && (
        <div className="body-sm mt-10" style={{ color: "var(--red)" }}>
          {list.error.message}
        </div>
      )}

      {!list.isPending && total === 0 && (
        <div className="mt-10">
          <EmptyState
            label="First day"
            title="Who are you becoming?"
            body="Add your first identity and the app will chase it every day."
            action={
              <Link to="/habits" className="btn btn-primary">
                First identity
              </Link>
            }
          />
        </div>
      )}

      {total > 0 && (
        <div className="timeline wide mt-6">
          {rows.map((r, i) => (
            <TimelineRow
              key={r.id}
              row={r}
              tz={tz}
              isNext={!r.done && i === firstIncomplete}
              groupName={r.groupId ? (groupById.get(r.groupId)?.name ?? null) : null}
              onToggle={() =>
                toggle.mutate({ identityId: r.id, date, done: !r.done, partial: false })
              }
              onTwoMinute={() =>
                toggle.mutate({ identityId: r.id, date, done: true, partial: true })
              }
            />
          ))}
        </div>
      )}

      {badRows.length > 0 && (
        <section className="mt-12">
          <div className="eyebrow" style={{ color: "var(--ink-3)" }}>
            Bad habits I'm weakening today
          </div>
          <div className="mt-3">
            {badRows.map((b) => (
              <div
                key={b.id}
                className="tl-row"
                style={{
                  gridTemplateColumns: "auto 1fr auto",
                  opacity: b.weakened ? 1 : 0.85,
                }}
              >
                <button
                  type="button"
                  className={"checkbox " + (b.weakened ? "done" : "")}
                  aria-label={b.weakened ? `Unmark ${b.name} weakened` : `Mark ${b.name} weakened`}
                  onClick={() =>
                    toggleBadHabit.mutate({ badHabitId: b.id, date, weakened: !b.weakened })
                  }
                >
                  {b.weakened && <IconCheck size={12} />}
                </button>
                <div>
                  <div className="stmt" style={{ color: "var(--ink-2)" }}>
                    {b.name}
                  </div>
                  {b.invisibleAction && (
                    <div className="act" style={{ fontSize: 11 }}>
                      {b.invisibleAction}
                    </div>
                  )}
                </div>
                <span className="chip" style={{ fontSize: 10 }}>
                  {b.weakened ? "weakened" : "open"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TodayCounter({
  done,
  total,
  cleanCount,
  cleanTotal,
}: {
  done: number;
  total: number;
  cleanCount: number;
  cleanTotal: number;
}) {
  if (total === 0 && cleanTotal === 0) return null;
  const still = Math.max(0, total - done);
  return (
    <div
      className="flex items-center gap-3.5 mt-5"
      style={{
        padding: "14px 0 20px",
        borderBottom: "0.5px solid var(--line)",
      }}
    >
      {total > 0 && <Ring value={done} total={total} size={52} stroke={3} />}
      <div>
        {total > 0 && (
          <div style={{ fontSize: 14, color: "var(--ink)", fontWeight: 500 }}>
            {done} of {total} votes cast today
          </div>
        )}
        <div
          style={{
            fontFamily: "Geist Mono, monospace",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginTop: 3,
            color: "var(--ink-3)",
          }}
        >
          {total > 0 && <span>{still} still open</span>}
          {cleanTotal > 0 && (
            <span style={{ marginLeft: total > 0 ? 10 : 0 }}>
              · {cleanCount}/{cleanTotal} bad habits weakened
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineRow({
  row,
  tz,
  isNext,
  groupName,
  onToggle,
  onTwoMinute,
}: {
  row: Row;
  tz: string;
  isNext: boolean;
  groupName: string | null;
  onToggle: () => void;
  onTwoMinute: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const pressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  function startPress() {
    longPressed.current = false;
    pressRef.current = setTimeout(() => {
      longPressed.current = true;
      setExpanded((e) => !e);
    }, 450);
  }
  function endPress() {
    if (pressRef.current) {
      clearTimeout(pressRef.current);
      pressRef.current = null;
    }
  }

  const displayTime = formatScheduledTime(row.scheduledTime, tz, "long");
  const cls = "tl-row" + (row.done ? " done" : "") + (isNext ? " next" : "");
  const hasReframe = !!(row.mindsetReframe || row.immediateReward || row.stackAfter);

  return (
    <>
      <div className={cls}>
        <div className="tl-time">{displayTime}</div>
        <button
          type="button"
          className={"checkbox " + (row.done ? "done" : isNext ? "next" : "")}
          aria-label={row.done ? `Unmark ${row.statement}` : `Mark ${row.statement} done`}
          onClick={onToggle}
        >
          {row.done && <IconCheck size={12} />}
        </button>
        <div
          onMouseDown={startPress}
          onMouseUp={endPress}
          onMouseLeave={endPress}
          onTouchStart={startPress}
          onTouchEnd={endPress}
          onContextMenu={(e) => {
            if (hasReframe) {
              e.preventDefault();
              setExpanded((x) => !x);
            }
          }}
          style={{ cursor: hasReframe ? "pointer" : "default" }}
          title={hasReframe ? "Long-press for reframe" : undefined}
        >
          <div className="stmt">{row.statement}</div>
          <div className="act">{row.action}</div>
          {row.partial && (
            <div className="meta" style={{ marginTop: 3, color: "var(--ink-3)", fontSize: 10 }}>
              2-minute version — still a vote
            </div>
          )}
          {groupName && (
            <div style={{ marginTop: 4 }}>
              <span className="chip" style={{ fontSize: 10 }}>
                My group: {groupName}
              </span>
            </div>
          )}
        </div>
        <div className={"tl-streak" + (row.streak === 0 ? " low" : "")}>{row.streak}d</div>
      </div>
      {expanded && hasReframe && (
        <div
          className="card"
          style={{
            margin: "0 0 10px 0",
            background: "var(--teal-soft)",
            borderColor: "rgba(124,181,165,0.3)",
          }}
        >
          {row.mindsetReframe && (
            <div style={{ fontSize: 14, fontStyle: "italic", color: "var(--ink)" }}>
              Because I get to {row.mindsetReframe}
            </div>
          )}
          {row.stackAfter && (
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color: "var(--ink-2)",
              }}
            >
              After {row.stackAfter}, I do this.
            </div>
          )}
          {row.immediateReward && (
            <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-2)" }}>
              Then: {row.immediateReward}.
            </div>
          )}
          {!row.done && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: 11, marginTop: 8 }}
              onClick={onTwoMinute}
            >
              2-minute version
            </button>
          )}
        </div>
      )}
    </>
  );
}
