import type { SVGProps } from "react";

type S = Omit<SVGProps<SVGSVGElement>, "size"> & { size?: number };

function base(size: number, strokeWidth = 1.6): Omit<SVGProps<SVGSVGElement>, "children"> {
  return {
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
}

/* ─────── tabs ─────── */

// Today → vertical day timeline with 3 marker dots (done / current / pending)
export const IconHome = ({ size = 18, ...p }: S) => (
  <svg {...base(size, 1.5)} {...p}>
    <path d="M5 4v16" strokeDasharray="1 2" opacity="0.55" />
    <path d="M12 3v18" />
    <circle cx="12" cy="6.5" r="2.2" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="2.2" strokeWidth="1.8" />
    <circle cx="12" cy="17.5" r="1.4" fill="currentColor" stroke="none" opacity="0.5" />
  </svg>
);

// Week → streak bars across 7 days, varied heights (real "bar chart" silhouette)
export const IconGrid = ({ size = 18 }: S) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" stroke="none">
    <rect x="2.5" y="14" width="2.2" height="6" rx="1.1" />
    <rect x="5.7" y="10" width="2.2" height="10" rx="1.1" />
    <rect x="8.9" y="12" width="2.2" height="8" rx="1.1" />
    <rect x="12.1" y="6" width="2.2" height="14" rx="1.1" />
    <rect x="15.3" y="9" width="2.2" height="11" rx="1.1" />
    <rect x="18.5" y="13" width="2.2" height="7" rx="1.1" />
    <rect x="21.7" y="11" width="2.2" height="9" rx="1.1" opacity="0.4" />
  </svg>
);

// Review → 5 stacked progress pips, three filled (the answered count)
export const IconReview = ({ size = 18 }: S) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" stroke="none">
    <rect x="3" y="4" width="18" height="2" rx="1" />
    <rect x="3" y="8.5" width="18" height="2" rx="1" />
    <rect x="3" y="13" width="18" height="2" rx="1" />
    <rect x="3" y="17.5" width="12" height="2" rx="1" opacity="0.35" />
  </svg>
);

// Journal → page with folded top-right corner + handwritten lines
export const IconJournal = ({ size = 18, ...p }: S) => (
  <svg {...base(size, 1.6)} {...p}>
    <path d="M6 3h10l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
    <path d="M16 3v4h4" />
    <path d="M8.5 12q1.5-1.5 3 0t3 0" />
    <path d="M8.5 16q1.5-1.5 3 0t3 0" opacity="0.7" />
  </svg>
);

// Habits → sprout: stem + two leaves + bud (identity growth)
export const IconHabits = ({ size = 18, ...p }: S) => (
  <svg {...base(size, 1.6)} {...p}>
    <path d="M12 21v-8" />
    <path d="M12 13c-3-1-6-1-7-5c4 0 6 1 7 5z" />
    <path d="M12 13c3-1 6-1 7-5c-4 0-6 1-7 5z" />
    <circle cx="12" cy="6" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);

/* ─────── utility ─────── */

export const IconPlus = ({ size = 14, ...p }: S) => (
  <svg {...base(size, 2.2)} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconLock = ({ size = 14, ...p }: S) => (
  <svg {...base(size, 1.75)} {...p}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const IconArrow = ({ size = 14, dir = "r", ...p }: S & { dir?: "l" | "r" }) => (
  <svg {...base(size, 1.75)} {...p}>
    <path d={dir === "r" ? "M5 12h14m-6-6 6 6-6 6" : "M19 12H5m6-6-6 6 6 6"} />
  </svg>
);

export const IconCaret = ({ size = 10, open = false, ...p }: S & { open?: boolean }) => (
  <svg
    {...base(size, 2)}
    style={{
      transform: open ? "rotate(180deg)" : "none",
      transition: "transform 140ms ease",
    }}
    {...p}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const IconCheck = ({ size = 12, ...p }: S) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="var(--teal-ink)"
    strokeWidth={2.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <path d="m4 12.5 5 5L20 6" />
  </svg>
);

/* ─────── four laws ─────── */

// 1st Law — Obvious (eye)
export const IconEye = ({ size = 14, ...p }: S) => (
  <svg {...base(size, 1.6)} {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

// 2nd Law — Attractive (heart)
export const IconHeart = ({ size = 14, ...p }: S) => (
  <svg {...base(size, 1.6)} {...p}>
    <path d="M20.4 4.6a5.5 5.5 0 0 0-7.8 0L12 5.2l-.6-.6a5.5 5.5 0 0 0-7.8 7.8l.6.6L12 21l7.8-8 .6-.6a5.5 5.5 0 0 0 0-7.8z" />
  </svg>
);

// 3rd Law — Easy (feather)
export const IconFeather = ({ size = 14, ...p }: S) => (
  <svg {...base(size, 1.6)} {...p}>
    <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5l6.74-6.76z" />
    <path d="M16 8 2 22" />
    <path d="M17.5 15H9" />
  </svg>
);

// 4th Law — Satisfying (check-circle)
export const IconCheckCircle = ({ size = 14, ...p }: S) => (
  <svg {...base(size, 1.6)} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.5 2.6 2.6L16 9.5" />
  </svg>
);

/* ─────── settings (unchanged) + theme ─────── */

export const IconSettings = ({ size = 16, ...p }: S) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    {...p}
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v4M12 18v4M4 12H2M22 12h-2" />
  </svg>
);

// Sun → concentric ring + 4 cardinal + 4 diagonal rays (not the standard 8-ray halo)
export const IconSun = ({ size = 16, ...p }: S) => (
  <svg {...base(size, 1.6)} {...p}>
    <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="6" opacity="0.35" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2" strokeWidth="2" />
    <path d="m5.6 5.6 1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" opacity="0.6" />
  </svg>
);

// Moon → crescent with a single star dot
export const IconMoon = ({ size = 16, ...p }: S) => (
  <svg {...base(size, 1.6)} {...p}>
    <path d="M20 13.5A8 8 0 1 1 10.5 4a6.5 6.5 0 0 0 9.5 9.5z" />
    <circle cx="17" cy="6" r="0.8" fill="currentColor" stroke="none" />
  </svg>
);

// Three vertical dots
export const IconMore = ({ size = 16, ...p }: S) => (
  <svg {...base(size, 1.8)} {...p}>
    <circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);
