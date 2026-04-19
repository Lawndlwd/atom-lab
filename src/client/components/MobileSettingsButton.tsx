import { Link } from "react-router-dom";
import { IconSettings } from "./icons";

export function MobileSettingsButton() {
  return (
    <Link
      to="/settings"
      aria-label="Settings"
      className="fixed lg:hidden"
      style={{
        top: "max(14px, env(safe-area-inset-top))",
        right: "14px",
        width: 38,
        height: 38,
        display: "grid",
        placeItems: "center",
        borderRadius: 999,
        background: "var(--bg-1)",
        border: "0.5px solid var(--line-2)",
        color: "var(--ink-2)",
        zIndex: 40,
      }}
    >
      <IconSettings size={18} />
    </Link>
  );
}
