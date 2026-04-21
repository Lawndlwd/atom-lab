import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  addDays,
  addMonths,
  addYears,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  getISOWeek,
  isSameDay,
  isSameMonth,
  parse,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { trpc } from "../../trpc";
import { IconArrow, IconPlus } from "../../components/icons";
import { EmptyState } from "../../components/EmptyState";
import { SectionDivider } from "../../components/SectionDivider";
const JournalEditor = lazy(() => import("./Editor"));

type View = "week" | "month" | "year";

type JournalType = {
  id: string;
  slug: string;
  label: string;
  color: string;
  order: number;
};

type Entry = {
  id: string;
  typeId: string;
  date: string;
  title: string;
  content: string;
  status: string;
  createdAt: string | Date;
};

const DOW_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FALLBACK_COLOR = "#7cb5a5";

function fmt(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function useTypeMap(types: JournalType[] | undefined) {
  return useMemo(() => {
    const m = new Map<string, JournalType>();
    for (const t of types ?? []) m.set(t.id, t);
    return m;
  }, [types]);
}

function colorFor(typeMap: Map<string, JournalType>, typeId: string) {
  return typeMap.get(typeId)?.color ?? FALLBACK_COLOR;
}

function labelFor(typeMap: Map<string, JournalType>, typeId: string) {
  return typeMap.get(typeId)?.label ?? "—";
}

export default function Journal() {
  const { entryId, date } = useParams();
  if (entryId) return <EntryView entryId={entryId} />;
  if (date) return <DayView date={date} />;
  return <CalendarView />;
}

/* ─────────────────────── Calendar ─────────────────────── */

function rangeFor(view: View, cursor: Date): { from: Date; to: Date } {
  if (view === "week") {
    return {
      from: startOfWeek(cursor, { weekStartsOn: 1 }),
      to: endOfWeek(cursor, { weekStartsOn: 1 }),
    };
  }
  if (view === "month") {
    const m0 = startOfMonth(cursor);
    const mE = endOfMonth(cursor);
    return {
      from: startOfWeek(m0, { weekStartsOn: 1 }),
      to: endOfWeek(mE, { weekStartsOn: 1 }),
    };
  }
  return { from: startOfYear(cursor), to: endOfYear(cursor) };
}

function CalendarView() {
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const today = new Date();

  const types = trpc.journal.listTypes.useQuery(undefined, { staleTime: 60_000 });
  const typeMap = useTypeMap(types.data as JournalType[] | undefined);

  const { from, to } = rangeFor(view, cursor);
  const entries = trpc.journal.listByRange.useQuery(
    { from: fmt(from), to: fmt(to) },
    { staleTime: 10_000 },
  );

  const entriesByDate = useMemo(() => {
    const m = new Map<string, Entry[]>();
    for (const e of (entries.data ?? []) as Entry[]) {
      const arr = m.get(e.date) ?? [];
      arr.push(e);
      m.set(e.date, arr);
    }
    return m;
  }, [entries.data]);

  const title = useMemo(() => {
    if (view === "week") {
      const s = startOfWeek(cursor, { weekStartsOn: 1 });
      const e = endOfWeek(cursor, { weekStartsOn: 1 });
      if (isSameMonth(s, e)) return `${format(s, "MMMM yyyy")} · wk ${getISOWeek(s)}`;
      return `${format(s, "MMM d")} – ${format(e, "MMM d yyyy")} · wk ${getISOWeek(s)}`;
    }
    if (view === "month") return format(cursor, "MMMM yyyy");
    return format(cursor, "yyyy");
  }, [cursor, view]);

  function shift(delta: number) {
    if (view === "week") setCursor(addDays(cursor, delta * 7));
    else if (view === "month") setCursor(addMonths(cursor, delta));
    else setCursor(addYears(cursor, delta));
  }

  const allEntries = (entries.data ?? []) as Entry[];

  return (
    <div className="px-5 pt-10 pb-6 lg:p-14 w-full max-w-[1440px] mx-auto">
      <header className="mb-4">
        <div className="eyebrow">Journal</div>
        <h1 className="title-lg mt-2">A record, by day.</h1>
      </header>

      <JournalLegend entries={allEntries} types={(types.data ?? []) as JournalType[]} />

      <div className="cal-toolbar">
        <div className="cal-nav">
          <button className="btn btn-secondary" onClick={() => shift(-1)} aria-label="Previous">
            <IconArrow dir="l" />
          </button>
          <div className="cal-title">{title}</div>
          <button className="btn btn-secondary" onClick={() => shift(+1)} aria-label="Next">
            <IconArrow dir="r" />
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => setCursor(new Date())}
            style={{ marginLeft: 4 }}
          >
            Today
          </button>
        </div>
        <div className="tab-bar">
          {(["week", "month", "year"] as View[]).map((v) => (
            <button
              key={v}
              className={"tab " + (view === v ? "active" : "")}
              onClick={() => setView(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {entries.isError && (
        <div className="body-sm" style={{ color: "var(--red)" }}>
          {entries.error.message}
        </div>
      )}

      {view === "week" && (
        <WeekGrid cursor={cursor} today={today} entriesByDate={entriesByDate} typeMap={typeMap} />
      )}
      {view === "month" && (
        <MonthGrid cursor={cursor} today={today} entriesByDate={entriesByDate} typeMap={typeMap} />
      )}
      {view === "year" && (
        <YearGrid
          cursor={cursor}
          today={today}
          entriesByDate={entriesByDate}
          onPickMonth={(d) => {
            setCursor(d);
            setView("month");
          }}
        />
      )}

      {!entries.isPending && allEntries.length === 0 && (
        <div className="mt-8">
          <EmptyState
            label="Empty"
            title="Nothing written in this view."
            body="Pick a day and write the first one."
          />
        </div>
      )}
    </div>
  );
}

function JournalLegend({ entries, types }: { entries: Entry[]; types: JournalType[] }) {
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of entries) m.set(e.typeId, (m.get(e.typeId) ?? 0) + 1);
    return m;
  }, [entries]);

  if (types.length === 0) return null;

  return (
    <div
      className="flex items-center gap-4 flex-wrap"
      style={{
        padding: "12px 0 14px",
        borderBottom: "0.5px solid var(--line-2)",
        marginBottom: 4,
      }}
    >
      <div className="eyebrow" style={{ fontSize: 10 }}>
        {entries.length} in view
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {types.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-1.5"
            style={{ fontSize: 11.5, color: "var(--ink-2)" }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: t.color,
                display: "inline-block",
              }}
            />
            <span style={{ color: "var(--ink-2)" }}>{t.label}</span>
            <span style={{ color: "var(--ink-4)", fontFamily: "Geist Mono, monospace" }}>
              {counts.get(t.id) ?? 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────── Week view ─────────────────────── */

function WeekGrid({
  cursor,
  today,
  entriesByDate,
  typeMap,
}: {
  cursor: Date;
  today: Date;
  entriesByDate: Map<string, Entry[]>;
  typeMap: Map<string, JournalType>;
}) {
  const nav = useNavigate();
  const start = startOfWeek(cursor, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  return (
    <div className="cal-week-grid">
      {days.map((d) => {
        const key = fmt(d);
        const es = entriesByDate.get(key) ?? [];
        const isToday = isSameDay(d, today);
        return (
          <button
            type="button"
            key={key}
            aria-label={`Open ${key}`}
            className={"cal-week-cell" + (isToday ? " today" : "")}
            onClick={() => nav(`/journal/day/${key}`)}
          >
            <div className="date-row">
              <span className="dow">{format(d, "EEE")}</span>
              <span className="date-num">{format(d, "d")}</span>
            </div>
            {es.length === 0 ? (
              <div
                style={{
                  color: "var(--ink-4)",
                  fontSize: 11,
                  fontStyle: "italic",
                  marginTop: 4,
                }}
              >
                —
              </div>
            ) : (
              <div className="flex flex-col gap-0">
                {es.slice(0, 5).map((e) => (
                  <div key={e.id} className="cal-entry-chip">
                    <span className="dot" style={{ background: colorFor(typeMap, e.typeId) }} />
                    <span className="t">{e.title}</span>
                  </div>
                ))}
                {es.length > 5 && (
                  <div
                    style={{
                      fontFamily: "Geist Mono, monospace",
                      fontSize: 10,
                      color: "var(--ink-3)",
                      marginTop: 4,
                    }}
                  >
                    +{es.length - 5} more
                  </div>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────── Month view ─────────────────────── */

function MonthGrid({
  cursor,
  today,
  entriesByDate,
  typeMap,
}: {
  cursor: Date;
  today: Date;
  entriesByDate: Map<string, Entry[]>;
  typeMap: Map<string, JournalType>;
}) {
  const nav = useNavigate();
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const cells: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) cells.push(d);

  return (
    <>
      <div className="cal-month-head">
        {DOW_SHORT.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="cal-month-grid">
        {cells.map((d) => {
          const key = fmt(d);
          const es = entriesByDate.get(key) ?? [];
          const has = es.length > 0;
          const isToday = isSameDay(d, today);
          const otherMonth = !isSameMonth(d, cursor);
          const usedTypes: JournalType[] = [];
          const seen = new Set<string>();
          for (const e of es) {
            if (seen.has(e.typeId)) continue;
            seen.add(e.typeId);
            const t = typeMap.get(e.typeId);
            if (t) usedTypes.push(t);
          }

          return (
            <button
              type="button"
              key={key}
              aria-label={`Open ${key}`}
              className={
                "cal-month-cell" +
                (otherMonth ? " muted" : "") +
                (has ? " has-entry" : "") +
                (isToday ? " today" : "")
              }
              onClick={() => nav(`/journal/day/${key}`)}
            >
              <div className="flex items-center justify-between">
                <span className="num">{format(d, "d")}</span>
                {es.length > 1 && (
                  <span
                    style={{
                      fontFamily: "Geist Mono, monospace",
                      fontSize: 10,
                      color: "var(--ink-3)",
                    }}
                  >
                    {es.length}
                  </span>
                )}
              </div>
              {has ? (
                <div className="hint" title={es[0].title}>
                  {es[0].title}
                </div>
              ) : (
                <div className="hint" style={{ color: "var(--ink-4)" }} />
              )}
              <div className="cal-dots">
                {usedTypes.map((t) => (
                  <span key={t.id} className="d" style={{ background: t.color }} />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ─────────────────────── Year view ─────────────────────── */

function YearGrid({
  cursor,
  today,
  entriesByDate,
  onPickMonth,
}: {
  cursor: Date;
  today: Date;
  entriesByDate: Map<string, Entry[]>;
  onPickMonth: (d: Date) => void;
}) {
  const nav = useNavigate();
  const yearStart = startOfYear(cursor);
  const months = Array.from({ length: 12 }, (_, i) => addMonths(yearStart, i));

  return (
    <div className="cal-year-grid">
      {months.map((m) => {
        const mStart = startOfMonth(m);
        const mEnd = endOfMonth(m);
        const gridStart = startOfWeek(mStart, { weekStartsOn: 1 });
        const gridEnd = endOfWeek(mEnd, { weekStartsOn: 1 });
        const cells: Date[] = [];
        for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) cells.push(d);

        let monthCount = 0;
        for (let d = mStart; d <= mEnd; d = addDays(d, 1)) {
          monthCount += entriesByDate.get(fmt(d))?.length ?? 0;
        }

        return (
          <div key={m.toISOString()} className="cal-year-mo">
            <button
              type="button"
              aria-label={`Open ${format(m, "MMMM yyyy")}`}
              className="mo-title flex items-center justify-between"
              onClick={() => onPickMonth(m)}
            >
              <span>{format(m, "MMMM")}</span>
              <span className="count">{monthCount}</span>
            </button>
            <div className="cal-year-mini">
              {DOW_SHORT.map((d) => (
                <div key={d} className="dowh">
                  {d[0]}
                </div>
              ))}
              {cells.map((d) => {
                const key = fmt(d);
                const es = entriesByDate.get(key) ?? [];
                const has = es.length > 0;
                const isToday = isSameDay(d, today);
                const otherMonth = !isSameMonth(d, m);
                return (
                  <button
                    type="button"
                    key={key}
                    disabled={otherMonth}
                    aria-label={otherMonth ? undefined : `Open ${key}`}
                    className={
                      "c" +
                      (otherMonth ? " other" : "") +
                      (has ? " has" : "") +
                      (isToday ? " today" : "")
                    }
                    title={has ? `${key} · ${es.length} entries` : key}
                    onClick={() => {
                      if (!otherMonth) nav(`/journal/day/${key}`);
                    }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────── Day view ─────────────────────── */

function DayView({ date }: { date: string }) {
  const nav = useNavigate();
  const util = trpc.useUtils();
  const types = trpc.journal.listTypes.useQuery(undefined, { staleTime: 60_000 });
  const typeMap = useTypeMap(types.data as JournalType[] | undefined);
  const entriesQ = trpc.journal.listByDate.useQuery({ date }, { staleTime: 10_000 });

  const [activeType, setActiveType] = useState<string>("all");
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<string>("");

  useEffect(() => {
    if (!newType && types.data && types.data.length > 0) {
      setNewType(types.data[0].id);
    }
  }, [types.data, newType]);

  const create = trpc.journal.createEntry.useMutation({
    onSuccess: (entry) => {
      util.journal.listByDate.invalidate({ date });
      util.journal.listByRange.invalidate();
      nav(`/journal/entry/${entry.id}`);
    },
  });

  const d = useMemo(() => parse(date, "yyyy-MM-dd", new Date()), [date]);
  const dayEntries = useMemo(() => (entriesQ.data ?? []) as Entry[], [entriesQ.data]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of dayEntries) m.set(e.typeId, (m.get(e.typeId) ?? 0) + 1);
    return m;
  }, [dayEntries]);

  const visible =
    activeType === "all" ? dayEntries : dayEntries.filter((e) => e.typeId === activeType);

  const isToday = isSameDay(d, new Date());

  function submitCreate() {
    const t = newTitle.trim();
    if (!t || !newType) return;
    create.mutate({ typeId: newType, date, title: t });
    setNewTitle("");
  }

  return (
    <div className="px-5 pt-10 pb-6 lg:p-14 w-full max-w-[1440px] mx-auto">
      <button className="btn btn-ghost mb-4" onClick={() => nav("/journal")}>
        <IconArrow dir="l" /> Calendar
      </button>

      <header className="mb-2">
        <div className="eyebrow">
          <span>{format(d, "EEEE")}</span>
          <span> · wk {getISOWeek(d)}</span>
          {isToday && <span style={{ color: "var(--teal)" }}> · today</span>}
        </div>
        <h1 className="title-lg mt-2">{format(d, "MMMM d, yyyy")}</h1>
      </header>

      <div
        className="flex items-center gap-2 flex-wrap"
        style={{ marginTop: 18, marginBottom: 18 }}
      >
        <div className="tab-bar">
          <button
            className={"tab " + (activeType === "all" ? "active" : "")}
            onClick={() => {
              setActiveType("all");
              if (types.data?.[0]) setNewType(types.data[0].id);
            }}
          >
            All <span className="count">{dayEntries.length}</span>
          </button>
          {(types.data ?? []).map((t) => (
            <button
              key={t.id}
              className={"tab " + (activeType === t.id ? "active" : "")}
              onClick={() => {
                setActiveType(t.id);
                setNewType(t.id);
              }}
            >
              {t.label} <span className="count">{counts.get(t.id) ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div
        className="flex items-center gap-2 flex-wrap mb-6"
        style={{
          padding: 12,
          background: "var(--bg-1)",
          border: "0.5px solid var(--line-2)",
          borderRadius: "var(--r-lg)",
        }}
      >
        <select
          className="input"
          style={{ width: "auto", padding: "10px 12px" }}
          value={newType}
          onChange={(e) => setNewType(e.target.value)}
        >
          {(types.data ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          className="input"
          placeholder="New entry title…"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitCreate();
          }}
          style={{ flex: 1, minWidth: 200 }}
        />
        <button
          className="btn btn-primary"
          disabled={!newTitle.trim() || !newType || create.isPending}
          onClick={submitCreate}
        >
          <IconPlus /> New entry
        </button>
      </div>

      {entriesQ.isPending ? (
        <div className="body-sm mt-2">Loading…</div>
      ) : visible.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            label="Empty"
            title="Nothing written for this day."
            body="A line is enough. The page doesn't need to be full."
          />
        </div>
      ) : (
        <>
          <SectionDivider label={`${visible.length} entries`} />
          <div className="flex flex-col gap-3">
            {visible.map((e) => {
              const color = colorFor(typeMap, e.typeId);
              const label = labelFor(typeMap, e.typeId);
              return (
                <button
                  key={e.id}
                  type="button"
                  aria-label={`Open entry ${e.title}`}
                  className="day-entry-card"
                  onClick={() => nav(`/journal/entry/${e.id}`)}
                >
                  <span className="accent" style={{ background: color }} />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="chip"
                        style={{
                          color,
                          borderColor: "color-mix(in srgb, " + color + " 35%, transparent)",
                          background: "color-mix(in srgb, " + color + " 10%, transparent)",
                        }}
                      >
                        {label}
                      </span>
                      <span className="meta" style={{ fontSize: 10.5, color: "var(--ink-3)" }}>
                        {format(new Date(e.createdAt), "HH:mm")}
                      </span>
                    </div>
                    <div className="t" style={{ marginTop: 6 }}>
                      {e.title}
                    </div>
                    {e.content && <div className="x">{e.content}</div>}
                  </div>
                  <IconArrow />
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────── Entry view ─────────────────────── */

function EntryView({ entryId }: { entryId: string }) {
  const nav = useNavigate();
  const util = trpc.useUtils();
  const entryQ = trpc.journal.getEntry.useQuery({ id: entryId });
  const types = trpc.journal.listTypes.useQuery(undefined, { staleTime: 60_000 });

  const update = trpc.journal.updateEntry.useMutation({
    onSuccess: () => {
      util.journal.getEntry.invalidate({ id: entryId });
      util.journal.listByRange.invalidate();
      util.journal.listByDate.invalidate();
    },
  });

  const remove = trpc.journal.deleteEntry.useMutation({
    onSuccess: () => {
      util.journal.listByRange.invalidate();
      util.journal.listByDate.invalidate();
    },
  });

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState<"clean" | "dirty" | "saving" | "saved">("clean");

  const entry = entryQ.data;
  const serverTitle = entry?.title ?? "";
  const serverContent = entry?.content ?? "";

  const loadedIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!entry || loadedIdRef.current === entry.id) return;
    loadedIdRef.current = entry.id;
    setTitle(entry.title);
    setContent(entry.content);
    setDirty("clean");
  }, [entry]);

  const updateRef = useRef(update);
  updateRef.current = update;
  const entryIdRef = useRef(entry?.id);
  entryIdRef.current = entry?.id;

  useEffect(() => {
    const id = entryIdRef.current;
    if (!id) return;
    if (title === serverTitle && content === serverContent) {
      setDirty((d) => (d === "saving" ? "saved" : d));
      return;
    }
    setDirty("dirty");
    const h = setTimeout(() => {
      setDirty("saving");
      updateRef.current.mutate(
        { id, title: title.trim() || "Untitled", content },
        { onSuccess: () => setDirty("saved") },
      );
    }, 600);
    return () => clearTimeout(h);
  }, [title, content, serverTitle, serverContent]);

  if (entryQ.isPending) {
    return (
      <div className="px-5 pt-10 pb-6 lg:p-14 w-full max-w-[1440px] mx-auto">
        <div className="body-sm">Loading…</div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="px-5 pt-10 pb-6 lg:p-14 w-full max-w-[1440px] mx-auto">
        <button className="btn btn-ghost mb-4" onClick={() => nav("/journal")}>
          <IconArrow dir="l" /> Calendar
        </button>
        <EmptyState label="Gone" title="Entry not found." body="It may have been deleted." />
      </div>
    );
  }

  const currentType =
    (types.data ?? []).find((t) => t.id === entry.typeId) ??
    (types.data?.[0] as JournalType | undefined);
  const color = currentType?.color ?? FALLBACK_COLOR;
  const d = parse(
    entry.date || format(new Date(entry.createdAt), "yyyy-MM-dd"),
    "yyyy-MM-dd",
    new Date(),
  );

  return (
    <div className="px-5 pt-10 pb-6 lg:p-14 w-full max-w-[1440px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4">
        <button className="btn btn-ghost" onClick={() => nav(`/journal/day/${entry.date}`)}>
          <IconArrow dir="l" /> {format(d, "MMMM d")}
        </button>
        <span
          className="meta"
          style={{ fontSize: 10.5, color: dirty === "dirty" ? "var(--amber)" : "var(--ink-3)" }}
        >
          {dirty === "saving" && "Saving…"}
          {dirty === "saved" && "Saved"}
          {dirty === "dirty" && "Unsaved"}
          {dirty === "clean" && " "}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <select
          className="chip"
          style={{
            color,
            borderColor: "color-mix(in srgb, " + color + " 35%, transparent)",
            background: "color-mix(in srgb, " + color + " 10%, transparent)",
            cursor: "pointer",
            appearance: "none",
            paddingRight: 14,
          }}
          value={entry.typeId}
          onChange={(e) => {
            update.mutate({ id: entry.id, typeId: e.target.value });
          }}
        >
          {(types.data ?? []).map((jt) => (
            <option key={jt.id} value={jt.id}>
              {jt.label}
            </option>
          ))}
        </select>
        <span className="meta" style={{ fontSize: 11 }}>
          {format(d, "EEEE, MMMM d, yyyy")} · {format(new Date(entry.createdAt), "HH:mm")}
        </span>
      </div>

      <input
        className="input"
        style={{
          fontFamily: "Fraunces, serif",
          fontSize: 30,
          letterSpacing: "-0.01em",
          padding: "12px 14px",
          background: "transparent",
          border: "0.5px solid transparent",
        }}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--line-2)";
          e.currentTarget.style.background = "var(--bg-1)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "transparent";
          e.currentTarget.style.background = "transparent";
        }}
      />

      <div className="card mt-2 journal-editor-wrap" style={{ padding: 0 }}>
        <Suspense
          fallback={
            <div className="body-sm" style={{ padding: 18 }}>
              Loading editor…
            </div>
          }
        >
          <JournalEditor key={entry.id} value={serverContent} onChange={setContent} />
        </Suspense>
      </div>

      <div className="flex justify-end mt-4">
        <button
          className="btn btn-danger"
          disabled={remove.isPending}
          onClick={() => {
            const back = `/journal/day/${entry.date}`;
            remove.mutate({ id: entry.id }, { onSuccess: () => nav(back) });
          }}
        >
          Delete entry
        </button>
      </div>
    </div>
  );
}
