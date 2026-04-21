-- AlterTable JournalType: add color
ALTER TABLE "JournalType" ADD COLUMN "color" TEXT NOT NULL DEFAULT '#7cb5a5';

-- RedefineTable JournalEntry: add content, date; make bsDocId nullable
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_JournalEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "date" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'idea',
    "bsDocId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JournalEntry_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "JournalType" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JournalEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JournalEntry_bsDocId_fkey" FOREIGN KEY ("bsDocId") REFERENCES "BlockSuiteDoc" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_JournalEntry" ("id", "userId", "typeId", "title", "status", "bsDocId", "createdAt", "date")
SELECT
    "id",
    "userId",
    "typeId",
    "title",
    "status",
    "bsDocId",
    "createdAt",
    COALESCE(substr(CAST("createdAt" AS TEXT), 1, 10), '')
FROM "JournalEntry";
DROP TABLE "JournalEntry";
ALTER TABLE "new_JournalEntry" RENAME TO "JournalEntry";
CREATE UNIQUE INDEX "JournalEntry_bsDocId_key" ON "JournalEntry"("bsDocId");
CREATE INDEX "JournalEntry_userId_typeId_idx" ON "JournalEntry"("userId", "typeId");
CREATE INDEX "JournalEntry_userId_date_idx" ON "JournalEntry"("userId", "date");
PRAGMA foreign_keys=ON;
