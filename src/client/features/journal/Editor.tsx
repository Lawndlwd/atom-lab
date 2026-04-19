import { useEffect, useRef, useState } from "react";
import { trpc } from "../../trpc";
import { useAuth } from "../../providers/auth";
import type { EditorBundle } from "./bs";

type Props = { entryId: string; title: string };

export function JournalEditor({ entryId, title }: Props) {
  const { user } = useAuth();
  const host = useRef<HTMLDivElement>(null);
  const bundle = useRef<EditorBundle | null>(null);
  const [mounted, setMounted] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const util = trpc.useUtils();
  const saveSnapshot = trpc.blocksuite.saveSnapshot.useMutation();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const { initJournalEditor } = await import("./bs");
        const b = await initJournalEditor({
          userId: user.id,
          entryId,
          title,
          client: {
            getSnapshot: async (docId) => {
              const r = await util.blocksuite.getSnapshot.fetch({ docId });
              return r.state ? new Uint8Array(r.state) : null;
            },
            saveSnapshot: async (docId, state) => {
              await saveSnapshot.mutateAsync({
                docId,
                state: Array.from(state),
              });
            },
          },
        });
        if (cancelled) {
          b.destroy();
          return;
        }
        bundle.current = b;
        if (host.current) host.current.appendChild(b.editor);
        setMounted(true);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
      bundle.current?.destroy();
      bundle.current = null;
    };
  }, [user, entryId]);

  return (
    <div className="journal-editor-wrap">
      {err && (
        <div className="body-sm" style={{ color: "var(--red)" }}>
          Editor failed to load: {err}
        </div>
      )}
      {!mounted && !err && (
        <div className="body-sm" style={{ color: "var(--ink-3)" }}>
          Loading editor…
        </div>
      )}
      <div ref={host} className="journal-editor" />
    </div>
  );
}
