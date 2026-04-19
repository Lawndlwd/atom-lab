-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "onboardedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Identity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "scheduledTime" TEXT NOT NULL,
    "cadence" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" DATETIME,
    CONSTRAINT "Identity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Vote_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "answers" TEXT NOT NULL DEFAULT '{}',
    "completedAt" DATETIME,
    CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JournalType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "JournalType_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'idea',
    "bsDocId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JournalEntry_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "JournalType" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JournalEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JournalEntry_bsDocId_fkey" FOREIGN KEY ("bsDocId") REFERENCES "BlockSuiteDoc" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BlockSuiteDoc" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "state" BLOB NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BlockSuiteDoc_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BlockSuiteSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "docId" TEXT NOT NULL,
    "state" BLOB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BlockSuiteSnapshot_docId_fkey" FOREIGN KEY ("docId") REFERENCES "BlockSuiteDoc" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HabitBacklog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "cadence" TEXT NOT NULL,
    "scheduledTime" TEXT,
    "unlocksAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'locked',
    CONSTRAINT "HabitBacklog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Config" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "ruleText" TEXT NOT NULL DEFAULT 'One new habit per month. All active must hold 14 days before unlock.',
    "newHabitCooldown" INTEGER NOT NULL DEFAULT 30,
    "minimumStreak" INTEGER NOT NULL DEFAULT 14,
    "maxActiveHabits" INTEGER NOT NULL DEFAULT 5,
    "lastUnlockAt" DATETIME,
    CONSTRAINT "Config_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PushLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PushLog_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Identity_userId_status_idx" ON "Identity"("userId", "status");

-- CreateIndex
CREATE INDEX "Vote_userId_date_idx" ON "Vote"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_identityId_date_key" ON "Vote"("identityId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Review_userId_year_weekNumber_key" ON "Review"("userId", "year", "weekNumber");

-- CreateIndex
CREATE UNIQUE INDEX "JournalType_userId_slug_key" ON "JournalType"("userId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_bsDocId_key" ON "JournalEntry"("bsDocId");

-- CreateIndex
CREATE INDEX "JournalEntry_userId_typeId_idx" ON "JournalEntry"("userId", "typeId");

-- CreateIndex
CREATE INDEX "BlockSuiteSnapshot_docId_createdAt_idx" ON "BlockSuiteSnapshot"("docId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "PushLog_userId_identityId_date_key" ON "PushLog"("userId", "identityId", "date");
