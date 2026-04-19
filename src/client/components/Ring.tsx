type Props = { value: number; total: number; size?: number; stroke?: number; label?: string };

export function Ring({ value, total, size = 52, stroke = 3, label }: Props) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const frac = total > 0 ? Math.max(0, Math.min(1, value / total)) : 0;
  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        display: "grid",
        placeItems: "center",
      }}
    >
      <svg
        width={size}
        height={size}
        style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke="var(--bg-3)"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke="var(--teal)"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - frac)}
          strokeLinecap="round"
        />
      </svg>
      <div
        className="meta"
        style={{ fontSize: size > 48 ? 13 : 11, color: "var(--ink)", letterSpacing: "0.04em" }}
      >
        {label ?? `${value}/${total}`}
      </div>
    </div>
  );
}
