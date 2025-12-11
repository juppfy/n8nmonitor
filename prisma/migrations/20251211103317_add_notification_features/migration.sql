-- CreateTable
CREATE TABLE "notification_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "workflowId" TEXT,
    "instanceId" TEXT,
    "executionId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" TEXT,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" DATETIME,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "workflow_error_counter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflowId" TEXT NOT NULL,
    "consecutiveErrors" INTEGER NOT NULL DEFAULT 0,
    "lastErrorAt" DATETIME,
    "lastSuccessAt" DATETIME,
    "totalErrors" INTEGER NOT NULL DEFAULT 0,
    "isAutoDeactivated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PushSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PushSubscription" ("auth", "createdAt", "endpoint", "id", "p256dh", "updatedAt", "userId") SELECT "auth", "createdAt", "endpoint", "id", "p256dh", "updatedAt", "userId" FROM "PushSubscription";
DROP TABLE "PushSubscription";
ALTER TABLE "new_PushSubscription" RENAME TO "PushSubscription";
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");
CREATE TABLE "new_UserSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "resendApiKey" TEXT,
    "resendFromEmail" TEXT,
    "pushNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "executionFailureAlerts" BOOLEAN NOT NULL DEFAULT true,
    "workflowStatusAlerts" BOOLEAN NOT NULL DEFAULT false,
    "notificationEmail" TEXT,
    "errorThreshold" INTEGER NOT NULL DEFAULT 1,
    "autoDeactivateWorkflow" BOOLEAN NOT NULL DEFAULT false,
    "autoDeactivateThreshold" INTEGER NOT NULL DEFAULT 3,
    "notifyOnSuccess" BOOLEAN NOT NULL DEFAULT false,
    "notifyOnError" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnWarning" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserSettings" ("createdAt", "emailNotificationsEnabled", "executionFailureAlerts", "id", "pushNotificationsEnabled", "resendApiKey", "resendFromEmail", "updatedAt", "userId", "workflowStatusAlerts") SELECT "createdAt", "emailNotificationsEnabled", "executionFailureAlerts", "id", "pushNotificationsEnabled", "resendApiKey", "resendFromEmail", "updatedAt", "userId", "workflowStatusAlerts" FROM "UserSettings";
DROP TABLE "UserSettings";
ALTER TABLE "new_UserSettings" RENAME TO "UserSettings";
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");
CREATE INDEX "UserSettings_userId_idx" ON "UserSettings"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "notification_log_userId_idx" ON "notification_log"("userId");

-- CreateIndex
CREATE INDEX "notification_log_workflowId_idx" ON "notification_log"("workflowId");

-- CreateIndex
CREATE INDEX "notification_log_sent_idx" ON "notification_log"("sent");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_error_counter_workflowId_key" ON "workflow_error_counter"("workflowId");

-- CreateIndex
CREATE INDEX "workflow_error_counter_workflowId_idx" ON "workflow_error_counter"("workflowId");
