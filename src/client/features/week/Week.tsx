import { useMemo, useState } from "react";
import { addDays, parse, format, getISOWeek } from "date-fns";
import { trpc } from "../../trpc";
import { useTodayDate } from "../../hooks/useTodayDate";
import { IconArrow } from "../../components/icons";
import { EmptyState } from "../../components/EmptyState";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfIsoWeek(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
}

export default function Week() {
  const { tz } = useTodayDate();
  const [weekStart, setWeekStart] = useState<string>(() => {
    const start = startOfIsoWeek(new Date());
    return format(start, "yyyy-MM-dd");
  });
  void tz;

  const q = trpc.vote.week.useQuery({ weekStart }, { staleTime: 30_000 });
  const bh = trpc.badHabits.week.useQuery({ weekStart }, { staleTime: 30_000 });

  const week = useMemo(() => getISOWeek(parse(weekStart, "yyyy-MM-dd", new Date())), [weekStart]);
  const endDate = useMemo(
    () => format(addDays(parse(weekStart, "yyyy-MM-dd", new Date()), 6), "MMM d"),
    [weekStart],
  );
  const startPretty = useMemo(
    () => format(parse(weekStart, "yyyy-MM-dd", new Date()), "MMM d"),
    [weekStart],
  );

  function shift(delta: number) {
    const d = parse(weekStart, "yyyy-MM-dd", new Date());
    setWeekStart(format(addDays(d, delta * 7), "yyyy-MM-dd"));
  }

  return (
    <div className="px-5 pt-10 pb-6 lg:p-14 w-full max-w-[1120px] mx-auto">
      <header className="flex items-end justify-between gap-6 flex-wrap mb-8">
        <div>
          <div className="eyebrow">
            Week {week} · {startPretty} – {endDate}
          </div>
          <h1 className="title-lg mt-2">Week at a glance.</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn btn-secondary"
            onClick={() => shift(-1)}
            aria-label="Previous week"
          >
            <IconArrow dir="l" />
          </button>
          <button className="btn btn-secondary" onClick={() => shift(+1)} aria-label="Next week">
            <IconArrow dir="r" />
          </button>
        </div>
      </header>

      {q.data && (
        <div className="week-stats">
          <div className="week-stat green">
            <div className="k">Votes</div>
            <div className="v">
              {q.data.stats.totalVotes}
              <span style={{ color: "var(--ink-3)", fontSize: 14, marginLeft: 4 }}>
                /{q.data.stats.totalScheduled}
              </span>
            </div>
          </div>
          <div className="week-stat green">
            <div className="k">Longest</div>
            <div className="v">{q.data.stats.globalLongest}d</div>
          </div>
          {bh.data && bh.data.rows.length > 0 && (
            <div className="week-stat">
              <div className="k">Bad weakened</div>
              <div className="v">
                {bh.data.stats.totalWeakened}
                <span style={{ color: "var(--ink-3)", fontSize: 14, marginLeft: 4 }}>
                  /{bh.data.stats.totalOpportunities}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-8">
        <div className="strip-dow week-dow-grid">
          {DOW.map((d) => (
            <div key={d}>{d}</div>
          ))}
          <div />
        </div>

        {q.data?.rows.map((r) => {
          const anyMiss = r.slabs.some((s) => s.state === "miss");
          return (
            <div key={r.id} className="strip-row">
              <div className="strip-row-head">
                <div>
                  <div className="stmt">{r.statement}</div>
                  <div className="act">{r.action}</div>
                </div>
                <div className="streak-cell" style={{ whiteSpace: "nowrap" }}>
                  {r.streak}d
                </div>
              </div>
              <div className="strip-row-track week-track-grid">
                {r.slabs.map((s, i) => (
                  <div
                    key={i}
                    className={"slab " + s.state + (s.isToday ? " today" : "")}
                    title={`${s.date}: ${s.state}${s.partial ? " (2-min)" : ""}`}
                  />
                ))}
                <div />
              </div>
              {anyMiss && (
                <div
                  className="body-sm"
                  style={{
                    marginTop: 6,
                    color: "var(--ink-3)",
                    fontSize: 11,
                    fontStyle: "italic",
                  }}
                >
                  Hard day? Did I fall back to the 2-minute version?
                </div>
              )}
            </div>
          );
        })}

        {!q.isPending && (q.data?.rows.length ?? 0) === 0 && (
          <div className="mt-4">
            <EmptyState
              label="First week"
              title="Too early to say."
              body="Cast a few votes before judging the week."
            />
          </div>
        )}
      </div>

      {bh.data && bh.data.rows.length > 0 && (
        <div className="mt-10">
          <div className="eyebrow" style={{ color: "var(--ink-3)" }}>
            Bad habits weakened
          </div>
          <div className="strip-dow week-dow-grid mt-3">
            {DOW.map((d) => (
              <div key={d}>{d}</div>
            ))}
            <div />
          </div>
          {bh.data.rows.map((r) => (
            <div key={r.id} className="strip-row">
              <div className="strip-row-head">
                <div>
                  <div className="stmt" style={{ color: "var(--ink-2)" }}>
                    {r.name}
                  </div>
                </div>
                <div className="streak-cell" style={{ whiteSpace: "nowrap" }}>
                  {r.slabs.filter((s) => s.weakened).length}/{r.slabs.length}
                </div>
              </div>
              <div className="strip-row-track week-track-grid">
                {r.slabs.map((s, i) => (
                  <div
                    key={i}
                    className={"slab " + (s.weakened ? "done" : "pending")}
                    title={`${s.date}: ${s.weakened ? "weakened" : "open"}`}
                  />
                ))}
                <div />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
