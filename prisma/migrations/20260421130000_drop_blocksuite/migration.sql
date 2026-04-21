-- DropTable BlockSuiteSnapshot (child first to avoid FK conflict)
PRAGMA foreign_keys=OFF;
DROP TABLE IF EXISTS "BlockSuiteSnapshot";
DROP TABLE IF EXISTS "BlockSuiteDoc";

-- RedefineTable JournalEntry: drop bsDocId column + its FK
CREATE TABLE "new_JournalEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "date" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'idea',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JournalEntry_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "JournalType" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JournalEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_JournalEntry" ("id", "userId", "typeId", "title", "content", "date", "status", "createdAt")
SELECT "id", "userId", "typeId", "title", "content", "date", "status", "createdAt"
FROM "JournalEntry";
DROP TABLE "JournalEntry";
ALTER TABLE "new_JournalEntry" RENAME TO "JournalEntry";
CREATE INDEX "JournalEntry_userId_typeId_idx" ON "JournalEntry"("userId", "typeId");
CREATE INDEX "JournalEntry_userId_date_idx" ON "JournalEntry"("userId", "date");
PRAGMA foreign_keys=ON;
