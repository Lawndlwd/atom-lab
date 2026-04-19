import type { SVGProps } from "react";

type S = SVGProps<SVGSVGElement> & { size?: number };

const svg = (size = 18): Omit<SVGProps<SVGSVGElement>, "children"> => ({
  viewBox: "0 0 24 24",
  width: size,
  height: size,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
});

export const IconHome = ({ size = 18, ...p }: S) => (
  <svg {...svg(size)} {...p}>
    <path d="M3 11l9-8 9 8v10a1 1 0 01-1 1h-5v-7h-6v7H4a1 1 0 01-1-1z" />
  </svg>
);
export const IconGrid = ({ size = 18, ...p }: S) => (
  <svg {...svg(size)} {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
export const IconReview = ({ size = 18, ...p }: S) => (
  <svg {...svg(size)} {...p}>
    <path d="M4 4h12l4 4v12H4z" />
    <path d="M8 10h8M8 14h8M8 18h5" />
  </svg>
);
export const IconJournal = ({ size = 18, ...p }: S) => (
  <svg {...svg(size)} {...p}>
    <path d="M5 3h11l3 3v15H5z" />
    <path d="M9 8h7M9 12h7M9 16h4" />
  </svg>
);
export const IconHabits = ({ size = 18, ...p }: S) => (
  <svg {...svg(size)} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.5 5.5L7.5 7.5M16.5 16.5L18.5 18.5M5.5 18.5L7.5 16.5M16.5 7.5L18.5 5.5" />
  </svg>
);
export const IconPlus = ({ size = 14, ...p }: S) => (
  <svg {...svg(size)} strokeWidth={1.8} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const IconLock = ({ size = 12, ...p }: S) => (
  <svg {...svg(size)} strokeWidth={1.8} {...p}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 018 0v3" />
  </svg>
);
export const IconChev = ({ size = 10, ...p }: S) => (
  <svg {...svg(size)} strokeWidth={1.8} {...p}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);
export const IconArrow = ({ size = 12, dir = "r", ...p }: S & { dir?: "l" | "r" }) => (
  <svg {...svg(size)} strokeWidth={1.8} {...p}>
    <path d={dir === "r" ? "M5 12h14M13 6l6 6-6 6" : "M19 12H5M11 6l-6 6 6 6"} />
  </svg>
);
export const IconCheck = ({ size = 12, ...p }: S) => (
  <svg viewBox="0 0 12 12" width={size} height={size} {...p}>
    <path
      d="M2 6l3 3 6-7"
      stroke="var(--teal-ink)"
      strokeWidth={2}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
export const IconSettings = ({ size = 16, ...p }: S) => (
  <svg {...svg(size)} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v4M12 18v4M4 12H2M22 12h-2" />
  </svg>
);
export const IconSun = ({ size = 16, ...p }: S) => (
  <svg {...svg(size)} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);
export const IconMoon = ({ size = 16, ...p }: S) => (
  <svg {...svg(size)} {...p}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);
