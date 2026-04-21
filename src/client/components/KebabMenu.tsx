import { useEffect, useRef, useState } from "react";
import { IconMore } from "./icons";

export type KebabAction = {
  label: string;
  onClick: () => void;
  tone?: "default" | "red" | "teal";
  hidden?: boolean;
};

export function KebabMenu({ actions }: { actions: KebabAction[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const visible = actions.filter((a) => !a.hidden);
  if (visible.length === 0) return null;

  return (
    <div ref={ref} className="kebab-wrap">
      <button
        type="button"
        className="kebab-btn"
        aria-label="More actions"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <IconMore size={16} />
      </button>
      {open && (
        <div className="kebab-menu" role="menu">
          {visible.map((a) => (
            <button
              key={a.label}
              role="menuitem"
              className={"kebab-item tone-" + (a.tone ?? "default")}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                a.onClick();
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
