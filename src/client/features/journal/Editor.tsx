import { useRef } from "react";
import { Crepe } from "@milkdown/crepe";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";

import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";

type Props = {
  value: string;
  onChange: (markdown: string) => void;
};

function CrepeEditor({ value, onChange }: Props) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const initialRef = useRef(value);
  const skipFirstRef = useRef(true);

  useEditor((root) => {
    const crepe = new Crepe({ root, defaultValue: initialRef.current ?? "" });
    crepe.editor.config((ctx) => {
      ctx.get(listenerCtx).markdownUpdated((_ctx, markdown, prev) => {
        if (skipFirstRef.current) {
          skipFirstRef.current = false;
          return;
        }
        if (markdown === prev) return;
        onChangeRef.current(markdown);
      });
    });
    crepe.editor.use(listener);
    return crepe;
  }, []);

  return <Milkdown />;
}

export default function JournalEditor(props: Props) {
  return (
    <MilkdownProvider>
      <CrepeEditor {...props} />
    </MilkdownProvider>
  );
}
