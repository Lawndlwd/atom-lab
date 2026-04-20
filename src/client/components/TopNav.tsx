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

export function TopNav({ userName }: Props) {
  const initial = userName?.[0]?.toUpperCase() ?? "A";
  return (
    <header
      className="hidden lg:flex sticky top-3 z-40 mx-auto w-[min(1200px,calc(100%-24px))] items-center gap-4"
      style={{
        background: "color-mix(in srgb, var(--bg) 62%, transparent)",
        backdropFilter: "blur(18px) saturate(140%)",
        WebkitBackdropFilter: "blur(18px) saturate(140%)",
        border: "0.5px solid var(--line-2)",
        borderRadius: "var(--r-xl)",
        padding: "8px 14px",
        boxShadow: "0 6px 24px rgba(0,0,0,0.18)",
      }}
    >
      <div
        style={{
          fontFamily: "Fraunces, serif",
          fontSize: 16,
          color: "var(--ink)",
          letterSpacing: "-0.01em",
          paddingRight: 6,
        }}
      >
        Identity<span style={{ color: "var(--teal)" }}>.</span>
      </div>

      <nav className="flex items-center gap-1">
        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[13px] transition-colors " +
              (isActive
                ? "text-[var(--ink)] bg-[var(--bg-2)]"
                : "text-[var(--ink-3)] hover:text-[var(--ink-2)]")
            }
          >
            <Icon size={14} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="flex-1" />

      <ThemeToggle variant="nav" />

      <NavLink
        to="/settings"
        className={({ isActive }) =>
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[13px] " +
          (isActive
            ? "text-[var(--ink)] bg-[var(--bg-2)]"
            : "text-[var(--ink-3)] hover:text-[var(--ink-2)]")
        }
      >
        <IconSettings size={14} />
        <span>Settings</span>
      </NavLink>

      <div
        className="flex items-center gap-2 pl-3"
        style={{ borderLeft: "0.5px solid var(--line)" }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "var(--teal)",
            color: "var(--teal-ink)",
            display: "grid",
            placeItems: "center",
            fontFamily: "Fraunces",
            fontWeight: 600,
            fontSize: 11,
          }}
        >
          {initial}
        </div>
        <div style={{ lineHeight: 1.15 }}>
          <div style={{ color: "var(--ink-2)", fontSize: 12 }}>{userName ?? "Anon"}</div>
          <div style={{ fontSize: 9, color: "var(--ink-3)" }}>Local · no sync</div>
        </div>
      </div>
    </header>
  );
}
