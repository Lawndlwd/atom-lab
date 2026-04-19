import { AffineSchemas } from "@blocksuite/blocks";
import { DocCollection, Schema, Text, type Y } from "@blocksuite/store";
import { AffineEditorContainer } from "@blocksuite/presets";
import "@blocksuite/presets/themes/affine.css";

export type SnapshotClient = {
  getSnapshot: (docId: string) => Promise<Uint8Array | null>;
  saveSnapshot: (docId: string, state: Uint8Array) => Promise<void>;
};

export type EditorBundle = {
  editor: AffineEditorContainer;
  collection: DocCollection;
  destroy: () => void;
};

function debounce<F extends (...args: unknown[]) => unknown>(fn: F, ms: number) {
  let t: number | null = null;
  const wrapped = (...args: Parameters<F>) => {
    if (t !== null) window.clearTimeout(t);
    t = window.setTimeout(() => {
      t = null;
      fn(...args);
    }, ms);
  };
  wrapped.flush = () => {
    if (t !== null) {
      window.clearTimeout(t);
      t = null;
      fn();
    }
  };
  wrapped.cancel = () => {
    if (t !== null) {
      window.clearTimeout(t);
      t = null;
    }
  };
  return wrapped as F & { flush: () => void; cancel: () => void };
}

export async function initJournalEditor(args: {
  userId: string;
  entryId: string;
  title: string;
  client: SnapshotClient;
}): Promise<EditorBundle> {
  const { userId, entryId, title, client } = args;
  const collectionId = `coll-${userId}-${entryId}`;
  const docId = `journal-${userId}-${entryId}`;

  const schema = new Schema().register(AffineSchemas);
  const collection = new DocCollection({ schema, id: collectionId });

  const collSnap = await client.getSnapshot(collectionId);
  if (collSnap && collSnap.byteLength > 0) {
    DocCollection.Y.applyUpdate(collection.doc, collSnap);
  }
  collection.meta.initialize();

  let doc = collection.getDoc(docId);
  if (!doc) {
    doc = collection.createDoc({ id: docId });
  }

  const spaceDoc = doc.spaceDoc as Y.Doc;

  const docSnap = await client.getSnapshot(docId);
  if (docSnap && docSnap.byteLength > 0) {
    DocCollection.Y.applyUpdate(spaceDoc, docSnap);
  }

  doc.load(() => {
    if (!doc!.root) {
      const pageBlockId = doc!.addBlock("affine:page", {
        title: new Text(title),
      });
      doc!.addBlock("affine:surface", {}, pageBlockId);
      const noteId = doc!.addBlock("affine:note", {}, pageBlockId);
      doc!.addBlock("affine:paragraph", {}, noteId);
    }
  });
  doc.resetHistory();

  const editor = new AffineEditorContainer();
  editor.doc = doc;

  const saveDoc = debounce(async () => {
    const state = DocCollection.Y.encodeStateAsUpdate(spaceDoc);
    await client.saveSnapshot(docId, state);
  }, 1500);

  const saveColl = debounce(async () => {
    const state = DocCollection.Y.encodeStateAsUpdate(collection.doc);
    await client.saveSnapshot(collectionId, state);
  }, 2000);

  spaceDoc.on("update", saveDoc);
  collection.doc.on("update", saveColl);

  const onBeforeUnload = () => {
    saveDoc.flush();
    saveColl.flush();
  };
  const onVis = () => {
    if (document.visibilityState === "hidden") {
      saveDoc.flush();
      saveColl.flush();
    }
  };
  window.addEventListener("beforeunload", onBeforeUnload);
  document.addEventListener("visibilitychange", onVis);

  return {
    editor,
    collection,
    destroy: () => {
      saveDoc.flush();
      saveColl.flush();
      saveDoc.cancel();
      saveColl.cancel();
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVis);
      try {
        editor.remove();
      } catch {}
      try {
        spaceDoc.destroy();
      } catch {}
      try {
        collection.doc.destroy();
      } catch {}
    },
  };
}
