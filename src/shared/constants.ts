export const REVIEW_QUESTIONS = [
  {
    key: "q1",
    q: "Which identity did I cast the most votes for this week?",
    hint: "Look at your Week view. Name the one you showed up for most.",
  },
  {
    key: "q2",
    q: "Which one did I skip — and what was the real reason?",
    hint: "Not the excuse. The real one.",
  },
  {
    key: "q3",
    q: "One change for next week to make the skipped habit easier.",
    hint: "Smaller, earlier, fewer steps. Something you can actually do tired.",
  },
  {
    key: "q4",
    q: "What did I learn this week?",
    hint: "One observation. A paragraph, not an essay.",
  },
  {
    key: "q5",
    q: "What did I build, ship, or start? What ships next?",
    hint: "Concrete output. Then the next concrete thing.",
  },
  {
    key: "q6",
    q: "Which group or community reinforced one of my identities this week?",
    hint: "If none: which one will I join next week? You become the tribe you sit with.",
  },
  {
    key: "q7",
    q: "Which bad habit did I make invisible or difficult this week — and what's the next step?",
    hint: "Name the friction you added. Then the next layer of friction.",
  },
] as const;

export type ReviewKey = (typeof REVIEW_QUESTIONS)[number]["key"];

export const CADENCES = [
  { key: "daily", label: "Daily" },
  { key: "weekdays", label: "Weekdays" },
  { key: "5x_week", label: "5× / week" },
  { key: "weekends", label: "Weekends" },
] as const;

export const JOURNAL_STATUS = [
  { key: "idea", label: "Idea" },
  { key: "building", label: "Building" },
  { key: "shipped", label: "Shipped" },
] as const;

export const DEFAULT_IDENTITY_SUGGESTIONS = [
  {
    statement: "I am an early riser.",
    action: "Up before 6:30, no snooze",
    scheduledTime: "06:25",
    cadence: "daily",
  },
  {
    statement: "I am a reader.",
    action: "Read 1 page before bed",
    scheduledTime: "21:45",
    cadence: "daily",
  },
  {
    statement: "I am a writer.",
    action: "Morning pages — paper",
    scheduledTime: "07:30",
    cadence: "daily",
  },
];

export const DEFAULT_JOURNAL_TYPES = [
  { slug: "log", label: "Log", order: 0 },
  { slug: "lab", label: "Lab", order: 1 },
];
