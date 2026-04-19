import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { trpc } from "../../trpc";
import { IconPlus, IconArrow } from "../../components/icons";
import { JOURNAL_STATUS } from "../../../shared/constants";
import { JournalEditor } from "./Editor";

export default function Journal() {
  const { entryId } = useParams();
  if (entryId) return <EntryView entryId={entryId} />;
  return <JournalList />;
}

function JournalList() {
  const nav = useNavigate();
  const types = trpc.journal.listTypes.useQuery();
  const [activeTypeId, setActiveTypeId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeTypeId && types.data && types.data.length > 0) {
      setActiveTypeId(types.data[0].id);
    }
  }, [types.data, activeTypeId]);

  const entries = trpc.journal.listEntries.useQuery(
    activeTypeId ? { typeId: activeTypeId } : (undefined as unknown as { typeId: string }),
    { enabled: !!activeTypeId },
  );

  const util = trpc.useUtils();
  const create = trpc.journal.createEntry.useMutation({
    onSuccess: (entry) => {
      util.journal.listEntries.invalidate({ typeId: entry.typeId });
      nav(`/journal/${entry.id}`);
    },
  });

  const [newTitle, setNewTitle] = useState("");

  return (
    <div className="px-5 pt-10 pb-6 lg:p-14 max-w-[1120px]">
      <header className="flex items-end justify-between gap-6 flex-wrap mb-6">
        <div>
          <div className="eyebrow">Journal</div>
          <h1 className="title-lg mt-2">Write it down.</h1>
        </div>
      </header>

      <div
        className="flex gap-1 p-1 rounded-full w-max mb-6"
        style={{ background: "var(--bg-1)", border: "0.5px solid var(--line-2)" }}
      >
        {types.data?.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTypeId(t.id)}
            className="px-4 py-1.5 rounded-full text-[11px] uppercase"
            style={{
              fontFamily: "Geist Mono, monospace",
              letterSpacing: "0.04em",
              background: t.id === activeTypeId ? "var(--bg-2)" : "transparent",
              color: t.id === activeTypeId ? "var(--ink)" : "var(--ink-3)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTypeId && (
        <div className="flex gap-2 mb-6">
          <input
            className="input"
            placeholder="New entry title…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <button
            className="btn btn-primary"
            disabled={!newTitle.trim() || create.isPending}
            onClick={() => {
              create.mutate({ typeId: activeTypeId, title: newTitle.trim() });
              setNewTitle("");
            }}
          >
            <IconPlus /> New
          </button>
        </div>
      )}

      <div
        className="hidden lg:grid"
        style={{
          gridTemplateColumns: "1.6fr 130px 2fr 70px",
          gap: 24,
          padding: "0 0 10px",
          borderBottom: "0.5px solid var(--line-2)",
          fontFamily: "Geist Mono, monospace",
          fontSize: 10,
          color: "var(--ink-3)",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}
      >
        <div>Title</div>
        <div>Status</div>
        <div>Created</div>
        <div>—</div>
      </div>

      {entries.data?.map((e) => (
        <div
          key={e.id}
          className="hidden lg:grid cursor-pointer"
          style={{
            gridTemplateColumns: "1.6fr 130px 2fr 70px",
            gap: 24,
            padding: "18px 0",
            borderBottom: "0.5px solid var(--line)",
            alignItems: "center",
          }}
          onClick={() => nav(`/journal/${e.id}`)}
        >
          <div className="title-sm" style={{ fontSize: 18 }}>
            {e.title}
          </div>
          <div>
            <StatusChip status={e.status} />
          </div>
          <div className="body-sm" style={{ color: "var(--ink-2)" }}>
            {new Date(e.createdAt).toLocaleString()}
          </div>
          <div style={{ textAlign: "right" }}>
            <IconArrow />
          </div>
        </div>
      ))}

      <div className="lg:hidden flex flex-col gap-3">
        {entries.data?.map((e) => (
          <div
            key={e.id}
            className="card cursor-pointer"
            style={{ padding: 16 }}
            onClick={() => nav(`/journal/${e.id}`)}
          >
            <div className="flex justify-between items-center mb-1">
              <div className="title-sm" style={{ fontSize: 16 }}>
                {e.title}
              </div>
              <StatusChip status={e.status} />
            </div>
            <div className="meta">{new Date(e.createdAt).toLocaleString()}</div>
          </div>
        ))}
      </div>

      {entries.data && entries.data.length === 0 && (
        <div className="card mt-4">
          <div className="eyebrow eyebrow-teal">Empty</div>
          <h2 className="title-md mt-2">No entries.</h2>
          <p className="body-sm mt-2">Start one.</p>
        </div>
      )}
    </div>
  );
}

function EntryView({ entryId }: { entryId: string }) {
  const nav = useNavigate();
  const entry = trpc.journal.getEntry.useQuery({ id: entryId });
  const util = trpc.useUtils();
  const update = trpc.journal.updateEntry.useMutation({
    onSuccess: () => {
      util.journal.listEntries.invalidate();
      util.journal.getEntry.invalidate({ id: entryId });
    },
  });

  return (
    <div className="px-5 pt-10 pb-6 lg:p-14 max-w-[1120px]">
      <button className="btn btn-ghost mb-4" onClick={() => nav("/journal")}>
        <IconArrow dir="l" /> All entries
      </button>
      {entry.data && (
        <>
          <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
            <div>
              <div className="eyebrow">{entry.data.type.label}</div>
              <h1 className="title-lg mt-2">{entry.data.title}</h1>
            </div>
            <select
              className="input"
              style={{ width: "auto" }}
              value={entry.data.status}
              onChange={(e) =>
                update.mutate({
                  id: entry.data!.id,
                  status: e.target.value as "idea" | "building" | "shipped",
                })
              }
            >
              {JOURNAL_STATUS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="card" style={{ padding: 0, background: "var(--bg)" }}>
            <JournalEditor entryId={entry.data.id} title={entry.data.title} />
          </div>
        </>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const cls = status === "shipped" ? "chip-teal-fill" : status === "building" ? "chip-teal" : "";
  return <span className={"chip " + cls}>{status}</span>;
}
