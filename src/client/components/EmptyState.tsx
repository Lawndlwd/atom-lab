import type { ReactNode } from "react";

type Props = {
  label?: string;
  title: string;
  body?: string;
  action?: ReactNode;
};

export function EmptyState({ label, title, body, action }: Props) {
  return (
    <div className="card" style={{ textAlign: "center", padding: "40px 28px" }}>
      {label && (
        <div className="eyebrow eyebrow-teal" style={{ marginBottom: 12 }}>
          {label}
        </div>
      )}
      <h2 className="title-md">{title}</h2>
      {body && (
        <p
          className="body-sm"
          style={{ maxWidth: 260, margin: "8px auto 0", color: "var(--ink-2)" }}
        >
          {body}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
