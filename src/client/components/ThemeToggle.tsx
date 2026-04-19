import { useTheme } from "../providers/theme";
import { IconMoon, IconSun } from "./icons";

type Props = { variant?: "nav" | "inline"; size?: number };

export function ThemeToggle({ variant = "nav", size = 16 }: Props) {
  const { theme, toggle } = useTheme();
  const label = theme === "dark" ? "Switch to light" : "Switch to dark";

  if (variant === "nav") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        title={label}
        className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px]"
        style={{ color: "var(--ink-3)", cursor: "pointer", background: "transparent", border: 0 }}
      >
        {theme === "dark" ? <IconSun size={size} /> : <IconMoon size={size} />}
        <span>{theme === "dark" ? "Light" : "Dark"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="btn btn-secondary"
    >
      {theme === "dark" ? <IconSun size={size} /> : <IconMoon size={size} />}
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}
