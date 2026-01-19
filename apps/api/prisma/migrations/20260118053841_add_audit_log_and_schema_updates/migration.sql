/*
  Warnings:

  - You are about to drop the column `description` on the `compliance_rules` table. All the data in the column will be lost.
  - You are about to drop the column `effectiveDate` on the `compliance_rules` table. All the data in the column will be lost.
  - You are about to drop the column `expirationDate` on the `compliance_rules` table. All the data in the column will be lost.
  - You are about to drop the column `sourceAuthority` on the `compliance_rules` table. All the data in the column will be lost.
  - You are about to drop the column `sourceUrl` on the `compliance_rules` table. All the data in the column will be lost.
  - You are about to drop the column `thresholdKg` on the `compliance_rules` table. All the data in the column will be lost.
  - You are about to drop the column `thresholdValue` on the `compliance_rules` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `compliance_rules` table. All the data in the column will be lost.
  - Added the required column `createdByAdminId` to the `compliance_rules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `disclaimerText` to the `compliance_rules` table without a default value. This is not possible if the table is not empty.
  - Made the column `productCategory` on table `compliance_rules` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'PUBLISH', 'UNPUBLISH', 'TOGGLE', 'APPROVE', 'REJECT', 'LOGIN', 'LOGOUT');

-- AlterTable
ALTER TABLE "compliance_rules" DROP COLUMN "description",
DROP COLUMN "effectiveDate",
DROP COLUMN "expirationDate",
DROP COLUMN "sourceAuthority",
DROP COLUMN "sourceUrl",
DROP COLUMN "thresholdKg",
DROP COLUMN "thresholdValue",
DROP COLUMN "title",
ADD COLUMN     "createdByAdminId" TEXT NOT NULL,
ADD COLUMN     "disclaimerText" TEXT NOT NULL,
ADD COLUMN     "maxWeightKg" DECIMAL(10,2),
ADD COLUMN     "minDeclaredValueUsd" DECIMAL(12,2),
ADD COLUMN     "minWeightKg" DECIMAL(10,2),
ADD COLUMN     "requiredCertifications" TEXT[],
ALTER COLUMN "productCategory" SET NOT NULL;

-- CreateTable
CREATE TABLE "compliance_evaluations" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT,
    "quoteId" TEXT,
    "orderId" TEXT,
    "destinationCountry" TEXT NOT NULL,
    "productCategory" TEXT NOT NULL,
    "declaredValueUsd" DECIMAL(12,2) NOT NULL,
    "weightKg" DECIMAL(10,2) NOT NULL,
    "appliedRuleIds" TEXT[],
    "requiredDocs" TEXT[],
    "warnings" TEXT[],
    "flags" TEXT[],
    "disclaimerText" TEXT NOT NULL,
    "complianceLevel" TEXT NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "compliance_evaluations_rfqId_idx" ON "compliance_evaluations"("rfqId");

-- CreateIndex
CREATE INDEX "compliance_evaluations_quoteId_idx" ON "compliance_evaluations"("quoteId");

-- CreateIndex
CREATE INDEX "compliance_evaluations_orderId_idx" ON "compliance_evaluations"("orderId");

-- CreateIndex
CREATE INDEX "compliance_evaluations_destinationCountry_idx" ON "compliance_evaluations"("destinationCountry");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_idx" ON "audit_logs"("entityType");

-- CreateIndex
CREATE INDEX "audit_logs_entityId_idx" ON "audit_logs"("entityId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "compliance_rules_productCategory_idx" ON "compliance_rules"("productCategory");

-- CreateIndex
CREATE INDEX "compliance_rules_destinationCountry_productCategory_idx" ON "compliance_rules"("destinationCountry", "productCategory");

-- AddForeignKey
ALTER TABLE "compliance_rules" ADD CONSTRAINT "compliance_rules_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_evaluations" ADD CONSTRAINT "compliance_evaluations_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "rfqs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_evaluations" ADD CONSTRAINT "compliance_evaluations_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_evaluations" ADD CONSTRAINT "compliance_evaluations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
