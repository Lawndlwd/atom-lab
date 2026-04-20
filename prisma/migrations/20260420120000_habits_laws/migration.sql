-- CreateTable Group (must exist before Identity.groupId FK)
CREATE TABLE "Group" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "identityItSupports" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "urlOrContact" TEXT,
    "note" TEXT,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Group_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Group_userId_idx" ON "Group"("userId");

-- AlterTable Identity: four-laws fields + optional group link
ALTER TABLE "Identity" ADD COLUMN "cueLocation" TEXT;
ALTER TABLE "Identity" ADD COLUMN "stackAfter" TEXT;
ALTER TABLE "Identity" ADD COLUMN "mindsetReframe" TEXT;
ALTER TABLE "Identity" ADD COLUMN "immediateReward" TEXT;
ALTER TABLE "Identity" ADD COLUMN "groupId" TEXT REFERENCES "Group"("id") ON DELETE SET NULL;

-- AlterTable Vote: partial flag for 2-minute fallback
ALTER TABLE "Vote" ADD COLUMN "partial" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable BadHabit
CREATE TABLE "BadHabit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "invisibleAction" TEXT,
    "unattractiveReframe" TEXT,
    "difficultAction" TEXT,
    "unsatisfyingConsequence" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" DATETIME,
    CONSTRAINT "BadHabit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "BadHabit_userId_status_idx" ON "BadHabit"("userId", "status");

-- CreateTable BadHabitLog
CREATE TABLE "BadHabitLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "badHabitId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "weakened" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BadHabitLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BadHabitLog_badHabitId_fkey" FOREIGN KEY ("badHabitId") REFERENCES "BadHabit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "BadHabitLog_badHabitId_date_key" ON "BadHabitLog"("badHabitId", "date");
CREATE INDEX "BadHabitLog_userId_date_idx" ON "BadHabitLog"("userId", "date");
