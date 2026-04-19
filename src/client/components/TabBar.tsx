import { NavLink } from "react-router-dom";
import { IconHome, IconGrid, IconReview, IconJournal, IconHabits } from "./icons";

const TABS = [
  { to: "/today", label: "Today", Icon: IconHome },
  { to: "/week", label: "Week", Icon: IconGrid },
  { to: "/review", label: "Review", Icon: IconReview },
  { to: "/journal", label: "Journal", Icon: IconJournal },
  { to: "/habits", label: "Habits", Icon: IconHabits },
];

export function TabBar() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 lg:hidden"
      style={{
        background: "rgba(13,11,9,0.82)",
        backdropFilter: "blur(16px)",
        borderTop: "0.5px solid var(--line-2)",
        paddingBottom: "env(safe-area-inset-bottom)",
        zIndex: 50,
      }}
    >
      <div className="flex justify-around px-2 pt-2 pb-2">
        {TABS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              "flex flex-col items-center gap-0.5 py-1 px-3 " +
              (isActive ? "text-[var(--teal)]" : "text-[var(--ink-4)]")
            }
            style={{
              fontFamily: "Geist Mono, monospace",
              fontSize: 9,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
