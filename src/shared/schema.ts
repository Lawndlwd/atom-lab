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
  cueLocation: z.string().max(120).nullable().optional(),
  stackAfter: z.string().max(200).nullable().optional(),
  mindsetReframe: z.string().max(280).nullable().optional(),
  immediateReward: z.string().max(200).nullable().optional(),
  groupId: z.string().min(1).nullable().optional(),
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
  partial: z.boolean().optional(),
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
  key: z.enum(["q1", "q2", "q3", "q4", "q5", "q6", "q7"]),
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

export const backlogUpdateInput = z.object({
  id: z.string().min(1),
  statement: z.string().min(1).max(160).optional(),
  action: z.string().min(1).max(200).optional(),
  cadence: cadenceSchema.optional(),
  scheduledTime: hhmmSchema.optional(),
});

export const ruleCreateInput = z.object({
  text: z.string().min(1).max(400),
  description: z.string().max(2000).optional(),
  cadence: cadenceSchema.optional(),
  scheduledTime: hhmmSchema.optional(),
});
export const ruleUpdateInput = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(400).optional(),
  description: z.string().max(2000).nullable().optional(),
  cadence: cadenceSchema.nullable().optional(),
  scheduledTime: hhmmSchema.nullable().optional(),
  order: z.number().int().min(0).max(1000).optional(),
});

export const importInput = z.object({
  identities: z.array(identityCreate).max(50).optional(),
  backlog: z.array(backlogCreateInput).max(50).optional(),
  journalTypes: z.array(journalTypeInput).max(20).optional(),
  rules: z
    .array(
      z.object({
        text: z.string().min(1).max(400),
        description: z.string().max(2000).optional(),
        cadence: cadenceSchema.optional(),
        scheduledTime: hhmmSchema.optional(),
      }),
    )
    .max(50)
    .optional(),
});

export const badHabitCreateInput = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(400).optional(),
  invisibleAction: z.string().max(280).optional(),
  unattractiveReframe: z.string().max(280).optional(),
  difficultAction: z.string().max(280).optional(),
  unsatisfyingConsequence: z.string().max(280).optional(),
});
export const badHabitUpdateInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(400).nullable().optional(),
  invisibleAction: z.string().max(280).nullable().optional(),
  unattractiveReframe: z.string().max(280).nullable().optional(),
  difficultAction: z.string().max(280).nullable().optional(),
  unsatisfyingConsequence: z.string().max(280).nullable().optional(),
});
export const badHabitLogInput = z.object({
  badHabitId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weakened: z.boolean().optional(),
  note: z.string().max(400).optional(),
});
export const badHabitListByDateInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export const badHabitWeekInput = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const groupCreateInput = z.object({
  identityItSupports: z.string().min(1).max(160),
  name: z.string().min(1).max(120),
  urlOrContact: z.string().max(400).optional(),
  note: z.string().max(400).optional(),
});
export const groupUpdateInput = z.object({
  id: z.string().min(1),
  identityItSupports: z.string().min(1).max(160).optional(),
  name: z.string().min(1).max(120).optional(),
  urlOrContact: z.string().max(400).nullable().optional(),
  note: z.string().max(400).nullable().optional(),
});

export const pushSubscribeInput = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
  userAgent: z.string().max(400).optional(),
});
