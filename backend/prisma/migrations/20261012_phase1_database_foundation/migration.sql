-- Migration: 20261012_phase1_database_foundation
-- Description: Add InstalledAsset, AmcContract, ServiceSchedule, Notification, and TechnicianAvailabilityLog models.

-- CreateTable
CREATE TABLE "InstalledAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "productId" TEXT,
    "modelName" TEXT,
    "serialNumber" TEXT,
    "installationDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "warrantyStartDate" DATETIME,
    "warrantyEndDate" DATETIME,
    "installationAddress" TEXT NOT NULL,
    "installationNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "installedByTechId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InstalledAsset_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile" ("customerId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InstalledAsset_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InstalledAsset_installedByTechId_fkey" FOREIGN KEY ("installedByTechId") REFERENCES "TechnicianProfile" ("technicianId") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AmcContract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contractNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "installedAssetId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "contractAmount" REAL NOT NULL,
    "includedVisits" INTEGER NOT NULL DEFAULT 4,
    "completedVisits" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "renewalStatus" TEXT NOT NULL DEFAULT 'NONE',
    "renewalNotes" TEXT,
    "previousContractId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AmcContract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile" ("customerId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AmcContract_installedAssetId_fkey" FOREIGN KEY ("installedAssetId") REFERENCES "InstalledAsset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AmcContract_previousContractId_fkey" FOREIGN KEY ("previousContractId") REFERENCES "AmcContract" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "installedAssetId" TEXT NOT NULL,
    "amcContractId" TEXT,
    "customerId" TEXT NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "scheduledStartTime" DATETIME,
    "scheduledEndTime" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "serviceType" TEXT NOT NULL DEFAULT 'PERIODIC_MAINTENANCE',
    "notes" TEXT,
    "serviceRequestId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceSchedule_installedAssetId_fkey" FOREIGN KEY ("installedAssetId") REFERENCES "InstalledAsset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ServiceSchedule_amcContractId_fkey" FOREIGN KEY ("amcContractId") REFERENCES "AmcContract" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceSchedule_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile" ("customerId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ServiceSchedule_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'GENERAL',
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TechnicianAvailabilityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "technicianId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TechnicianAvailabilityLog_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "TechnicianProfile" ("technicianId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "totalAmount" REAL NOT NULL,
    "gstAmount" REAL NOT NULL,
    "discount" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "pdfUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amcContractId" TEXT,
    CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile" ("customerId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invoice_amcContractId_fkey" FOREIGN KEY ("amcContractId") REFERENCES "AmcContract" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("createdAt", "customerId", "discount", "gstAmount", "id", "invoiceNumber", "pdfUrl", "status", "totalAmount") SELECT "createdAt", "customerId", "discount", "gstAmount", "id", "invoiceNumber", "pdfUrl", "status", "totalAmount" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");
CREATE INDEX "Invoice_amcContractId_idx" ON "Invoice"("amcContractId");

CREATE TABLE "new_ServiceRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "assignedTechId" TEXT,
    "scheduledDate" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "otpCode" TEXT,
    "installedAssetId" TEXT,
    CONSTRAINT "ServiceRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile" ("customerId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ServiceRequest_assignedTechId_fkey" FOREIGN KEY ("assignedTechId") REFERENCES "TechnicianProfile" ("technicianId") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceRequest_installedAssetId_fkey" FOREIGN KEY ("installedAssetId") REFERENCES "InstalledAsset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ServiceRequest" ("assignedTechId", "createdAt", "customerId", "description", "id", "notes", "otpCode", "scheduledDate", "status") SELECT "assignedTechId", "createdAt", "customerId", "description", "id", "notes", "otpCode", "scheduledDate", "status" FROM "ServiceRequest";
DROP TABLE "ServiceRequest";
ALTER TABLE "new_ServiceRequest" RENAME TO "ServiceRequest";
CREATE INDEX "ServiceRequest_customerId_idx" ON "ServiceRequest"("customerId");
CREATE INDEX "ServiceRequest_assignedTechId_idx" ON "ServiceRequest"("assignedTechId");
CREATE INDEX "ServiceRequest_status_idx" ON "ServiceRequest"("status");
CREATE INDEX "ServiceRequest_installedAssetId_idx" ON "ServiceRequest"("installedAssetId");

CREATE TABLE "new_TechnicianProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "photoUrl" TEXT,
    "availabilityStatus" TEXT NOT NULL DEFAULT 'AVAILABLE',
    CONSTRAINT "TechnicianProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TechnicianProfile" ("id", "photoUrl", "technicianId", "userId") SELECT "id", "photoUrl", "technicianId", "userId" FROM "TechnicianProfile";
DROP TABLE "TechnicianProfile";
ALTER TABLE "new_TechnicianProfile" RENAME TO "TechnicianProfile";
CREATE UNIQUE INDEX "TechnicianProfile_userId_key" ON "TechnicianProfile"("userId");
CREATE UNIQUE INDEX "TechnicianProfile_technicianId_key" ON "TechnicianProfile"("technicianId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "InstalledAsset_serialNumber_key" ON "InstalledAsset"("serialNumber");
CREATE INDEX "InstalledAsset_customerId_idx" ON "InstalledAsset"("customerId");
CREATE INDEX "InstalledAsset_productId_idx" ON "InstalledAsset"("productId");
CREATE INDEX "InstalledAsset_status_idx" ON "InstalledAsset"("status");
CREATE INDEX "InstalledAsset_installedByTechId_idx" ON "InstalledAsset"("installedByTechId");

-- CreateIndex
CREATE UNIQUE INDEX "AmcContract_contractNumber_key" ON "AmcContract"("contractNumber");
CREATE UNIQUE INDEX "AmcContract_previousContractId_key" ON "AmcContract"("previousContractId");
CREATE INDEX "AmcContract_customerId_idx" ON "AmcContract"("customerId");
CREATE INDEX "AmcContract_installedAssetId_idx" ON "AmcContract"("installedAssetId");
CREATE INDEX "AmcContract_status_idx" ON "AmcContract"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceSchedule_serviceRequestId_key" ON "ServiceSchedule"("serviceRequestId");
CREATE INDEX "ServiceSchedule_installedAssetId_idx" ON "ServiceSchedule"("installedAssetId");
CREATE INDEX "ServiceSchedule_amcContractId_idx" ON "ServiceSchedule"("amcContractId");
CREATE INDEX "ServiceSchedule_customerId_idx" ON "ServiceSchedule"("customerId");
CREATE INDEX "ServiceSchedule_dueDate_idx" ON "ServiceSchedule"("dueDate");
CREATE INDEX "ServiceSchedule_status_idx" ON "ServiceSchedule"("status");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "TechnicianAvailabilityLog_technicianId_idx" ON "TechnicianAvailabilityLog"("technicianId");

-- CreateIndex
CREATE INDEX "Attendance_technicianId_idx" ON "Attendance"("technicianId");
CREATE INDEX "Attendance_date_idx" ON "Attendance"("date");
