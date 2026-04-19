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
  streak: number;
};

export default function Today() {
  const { date, pretty, prettyLong, week, tz } = useTodayDate();
  const util = trpc.useUtils();
  const list = trpc.vote.list.useQuery({ date }, { staleTime: 10_000 });

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

  const rows = list.data?.rows ?? [];
  const doneCount = rows.filter((r) => r.done).length;
  const total = rows.length;

  const firstIncomplete = rows.findIndex((r) => !r.done);

  return (
    <div className="px-5 pt-10 pb-6 lg:p-14 w-full max-w-[1180px] mx-auto">
      <header>
        <div className="eyebrow">
          <span className="hidden lg:inline">{prettyLong}</span>
          <span className="lg:hidden">{pretty}</span>
          <span> · Week {week}</span>
        </div>
        <h1 className="title-lg mt-2">Today, in order.</h1>
        <TodayCounter done={doneCount} total={total} />
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
              onToggle={() => toggle.mutate({ identityId: r.id, date, done: !r.done })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TodayCounter({ done, total }: { done: number; total: number }) {
  if (total === 0) return null;
  const still = Math.max(0, total - done);
  return (
    <div
      className="flex items-center gap-3.5 mt-5"
      style={{
        padding: "14px 0 20px",
        borderBottom: "0.5px solid var(--line)",
      }}
    >
      <Ring value={done} total={total} size={52} stroke={3} />
      <div>
        <div style={{ fontSize: 14, color: "var(--ink)", fontWeight: 500 }}>
          {done} of {total} votes cast
        </div>
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
          {still} still open
        </div>
      </div>
    </div>
  );
}

function TimelineRow({
  row,
  tz,
  isNext,
  onToggle,
}: {
  row: Row;
  tz: string;
  isNext: boolean;
  onToggle: () => void;
}) {
  const displayTime = formatScheduledTime(row.scheduledTime, tz, "long");
  const cls = "tl-row" + (row.done ? " done" : "") + (isNext ? " next" : "");
  return (
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
      <div>
        <div className="stmt">{row.statement}</div>
        <div className="act">{row.action}</div>
      </div>
      <div className={"tl-streak" + (row.streak === 0 ? " low" : "")}>{row.streak}d</div>
    </div>
  );
}
