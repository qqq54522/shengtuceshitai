PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "ProviderConfig" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "baseUrl" TEXT NOT NULL,
  "apiKeyEncrypted" TEXT NOT NULL,
  "defaultModel" TEXT NOT NULL,
  "supportedModes" TEXT NOT NULL DEFAULT '["text-to-image"]',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "GenerationTask" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "mode" TEXT NOT NULL,
  "providerId" TEXT,
  "providerName" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "negativePrompt" TEXT,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "seed" INTEGER,
  "count" INTEGER NOT NULL DEFAULT 1,
  "sourceImageId" TEXT,
  "maskImageId" TEXT,
  "expandDirections" TEXT,
  "upscaleFactor" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "errorMessage" TEXT,
  "durationMs" INTEGER,
  "requestPayload" TEXT,
  "responsePayload" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "GenerationTask_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "ProviderConfig" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "GeneratedAsset" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "taskId" TEXT,
  "providerId" TEXT,
  "providerName" TEXT,
  "imageUrl" TEXT NOT NULL,
  "thumbnailUrl" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "model" TEXT,
  "prompt" TEXT,
  "negativePrompt" TEXT,
  "width" INTEGER,
  "height" INTEGER,
  "seed" INTEGER,
  "tags" TEXT NOT NULL DEFAULT '[]',
  "favorite" BOOLEAN NOT NULL DEFAULT false,
  "metadata" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "GeneratedAsset_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "GenerationTask" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "GenerationTask_providerId_idx"
  ON "GenerationTask" ("providerId");

CREATE INDEX IF NOT EXISTS "GeneratedAsset_taskId_idx"
  ON "GeneratedAsset" ("taskId");

CREATE INDEX IF NOT EXISTS "GeneratedAsset_providerId_idx"
  ON "GeneratedAsset" ("providerId");

CREATE INDEX IF NOT EXISTS "GeneratedAsset_createdAt_idx"
  ON "GeneratedAsset" ("createdAt");
