export type RuleContext = {
  cooldownDays: number;
  minimumStreak: number;
  maxActiveHabits: number;
  lastUnlockAt: Date | null;
  activeCount: number;
  activeStreaks: number[];
  now: Date;
};

export type UnlockCheck = { ok: true } | { ok: false; reason: string; unlocksAt: Date | null };

export function canUnlock(ctx: RuleContext): UnlockCheck {
  if (ctx.activeCount >= ctx.maxActiveHabits) {
    return {
      ok: false,
      reason: `Active cap reached (${ctx.maxActiveHabits}). Archive one first.`,
      unlocksAt: null,
    };
  }
  const floor = ctx.activeStreaks.length ? Math.min(...ctx.activeStreaks) : Infinity;
  if (floor < ctx.minimumStreak) {
    return {
      ok: false,
      reason: `Lowest active streak is ${floor}d. Needs ${ctx.minimumStreak}d across all active.`,
      unlocksAt: null,
    };
  }
  if (ctx.lastUnlockAt) {
    const msCooldown = ctx.cooldownDays * 86_400_000;
    const next = new Date(ctx.lastUnlockAt.getTime() + msCooldown);
    if (next > ctx.now) {
      const daysLeft = Math.ceil((next.getTime() - ctx.now.getTime()) / 86_400_000);
      return { ok: false, reason: `Cool-down: ${daysLeft}d remaining.`, unlocksAt: next };
    }
  }
  return { ok: true };
}
