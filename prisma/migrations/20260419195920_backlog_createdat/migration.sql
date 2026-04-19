-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_HabitBacklog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "cadence" TEXT NOT NULL,
    "scheduledTime" TEXT,
    "unlocksAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'locked',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HabitBacklog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_HabitBacklog" ("action", "cadence", "id", "scheduledTime", "statement", "status", "unlocksAt", "userId") SELECT "action", "cadence", "id", "scheduledTime", "statement", "status", "unlocksAt", "userId" FROM "HabitBacklog";
DROP TABLE "HabitBacklog";
ALTER TABLE "new_HabitBacklog" RENAME TO "HabitBacklog";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
