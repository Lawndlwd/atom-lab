import { z } from "zod";

export const emailSchema = z
  .string()
  .email()
  .max(320)
  .transform((s) => s.toLowerCase().trim());
export const passwordSchema = z.string().min(8).max(200);
export const nameSchema = z
  .string()
  .min(1)
  .max(80)
  .transform((s) => s.trim());

export const hhmmSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm 24h format");

export const cadenceSchema = z.enum(["daily", "weekdays", "5x_week", "weekends", "custom"]);
export const identityStatusSchema = z.enum(["active", "archived"]);
export const journalStatusSchema = z.enum(["idea", "building", "shipped"]);

export const signUpInput = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
});
export const signInInput = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const identityCreate = z.object({
  statement: z.string().min(1).max(160),
  action: z.string().min(1).max(200),
  scheduledTime: hhmmSchema,
  cadence: cadenceSchema,
});
export const identityUpdate = identityCreate.partial().extend({ id: z.string().min(1) });

export const journalTypeInput = z.object({
  slug: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9_-]+$/),
  label: z.string().min(1).max(40),
  order: z.number().int().min(0).max(50).default(0),
});

export const configInput = z.object({
  ruleText: z.string().min(1).max(400).optional(),
  newHabitCooldown: z.number().int().min(0).max(365).optional(),
  minimumStreak: z.number().int().min(0).max(365).optional(),
  maxActiveHabits: z.number().int().min(1).max(20).optional(),
});

export const onboardingInput = z.object({
  name: nameSchema,
  timezone: z.string().min(1).max(80),
  identities: z.array(identityCreate).min(1).max(10),
  journalTypes: z.array(journalTypeInput).min(1).max(6),
  config: configInput,
});

export const voteToggleInput = z.object({
  identityId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  done: z.boolean().optional(),
});

export const voteListInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const voteWeekInput = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const reviewSetAnswerInput = z.object({
  year: z.number().int(),
  weekNumber: z.number().int(),
  key: z.enum(["q1", "q2", "q3", "q4", "q5"]),
  text: z.string().max(10000),
});

export const journalCreateEntryInput = z.object({
  typeId: z.string().min(1),
  title: z.string().min(1).max(200),
});
export const journalUpdateEntryInput = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  status: journalStatusSchema.optional(),
});

export const backlogCreateInput = z.object({
  statement: z.string().min(1).max(160),
  action: z.string().min(1).max(200),
  cadence: cadenceSchema,
  scheduledTime: hhmmSchema.optional(),
});

export const pushSubscribeInput = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
  userAgent: z.string().max(400).optional(),
});
