import { NavLink } from "react-router-dom";
import { IconHome, IconGrid, IconReview, IconJournal, IconHabits, IconSettings } from "./icons";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { to: "/today", label: "Today", Icon: IconHome },
  { to: "/week", label: "Week", Icon: IconGrid },
  { to: "/review", label: "Review", Icon: IconReview },
  { to: "/journal", label: "Journal", Icon: IconJournal },
  { to: "/habits", label: "Habits", Icon: IconHabits },
];

type Props = { userName?: string };

export function SideNav({ userName }: Props) {
  const initial = userName?.[0]?.toUpperCase() ?? "A";
  return (
    <aside
      className="hidden lg:flex flex-col shrink-0"
      style={{
        width: 220,
        background: "var(--bg)",
        borderRight: "0.5px solid var(--line-2)",
        padding: "22px 14px",
        gap: 3,
        position: "sticky",
        top: 0,
        height: "100vh",
      }}
    >
      <div
        style={{
          fontFamily: "Fraunces, serif",
          fontSize: 18,
          padding: "4px 10px 22px",
          color: "var(--ink)",
          letterSpacing: "-0.01em",
        }}
      >
        Identity<span style={{ color: "var(--teal)" }}>.</span>
      </div>

      {NAV.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] " +
            (isActive
              ? "text-[var(--ink)] bg-[var(--bg-2)]"
              : "text-[var(--ink-3)] hover:text-[var(--ink-2)]")
          }
        >
          <Icon size={16} />
          <span>{label}</span>
        </NavLink>
      ))}

      <div className="flex-1" />

      <ThemeToggle variant="nav" />

      <NavLink
        to="/settings"
        className={({ isActive }) =>
          "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] " +
          (isActive
            ? "text-[var(--ink)] bg-[var(--bg-2)]"
            : "text-[var(--ink-3)] hover:text-[var(--ink-2)]")
        }
      >
        <IconSettings size={16} />
        <span>Settings</span>
      </NavLink>

      <div
        className="flex items-center gap-2.5 pt-2.5 mt-2"
        style={{ borderTop: "0.5px solid var(--line)" }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "var(--teal)",
            color: "var(--teal-ink)",
            display: "grid",
            placeItems: "center",
            fontFamily: "Fraunces",
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          {initial}
        </div>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ color: "var(--ink-2)", fontSize: 12 }}>{userName ?? "Anon"}</div>
          <div style={{ fontSize: 10, color: "var(--ink-3)" }}>Local · no sync</div>
        </div>
      </div>
    </aside>
  );
}
