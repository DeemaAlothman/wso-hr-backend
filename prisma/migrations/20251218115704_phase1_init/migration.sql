/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "LeaveRequestStatus" AS ENUM ('pending_manager', 'approved_manager', 'rejected_manager', 'pending_hr', 'approved_hr', 'rejected_hr', 'cancelled', 'on_hold');

-- CreateEnum
CREATE TYPE "HalfDayPeriod" AS ENUM ('morning', 'afternoon');

-- CreateEnum
CREATE TYPE "HolidayType" AS ENUM ('religious', 'national', 'special', 'seasonal');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('system', 'leave', 'hr', 'security');

-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('login', 'logout', 'create', 'update', 'delete', 'approve', 'reject', 'cancel', 'upload', 'assign_role', 'remove_role');

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "departments" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "parentId" INTEGER,
    "managerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wso_sys_users" (
    "id" SERIAL NOT NULL,
    "userLogin" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayName" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "birthDate" TIMESTAMP(3),
    "gender" "Gender",
    "nationality" TEXT,
    "nationalId" TEXT,
    "employeeNo" TEXT,
    "position" TEXT,
    "hireDate" TIMESTAMP(3),
    "departmentId" INTEGER,
    "avatarUrl" TEXT,
    "signatureUrl" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "lastLoginUserAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wso_sys_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wso_roles" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wso_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wso_users_roles" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" INTEGER,

    CONSTRAINT "wso_users_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" SERIAL NOT NULL,
    "roleId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_leave_types" (
    "id" SERIAL NOT NULL,
    "leaveTypeName" TEXT NOT NULL,
    "leaveTypeCode" TEXT NOT NULL,
    "description" TEXT,
    "annualEntitlement" INTEGER NOT NULL DEFAULT 0,
    "maxConsecutiveDays" INTEGER NOT NULL DEFAULT 0,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "requiresAttachment" BOOLEAN NOT NULL DEFAULT false,
    "isPaid" BOOLEAN NOT NULL DEFAULT true,
    "affectsSalary" BOOLEAN NOT NULL DEFAULT false,
    "isCarryoverAllowed" BOOLEAN NOT NULL DEFAULT false,
    "maxCarryoverDays" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_leave_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_leave_balance" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "leaveTypeId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalEntitlement" INTEGER NOT NULL DEFAULT 0,
    "carriedOver" INTEGER NOT NULL DEFAULT 0,
    "usedBalance" INTEGER NOT NULL DEFAULT 0,
    "remainingBalance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_leave_balance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_leave_balance_history" (
    "id" SERIAL NOT NULL,
    "balanceId" INTEGER NOT NULL,
    "changedById" INTEGER,
    "changeReason" TEXT,
    "delta" INTEGER NOT NULL DEFAULT 0,
    "before" INTEGER NOT NULL DEFAULT 0,
    "after" INTEGER NOT NULL DEFAULT 0,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_leave_balance_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_leave_requests" (
    "id" SERIAL NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "leaveTypeId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "isHalfDay" BOOLEAN NOT NULL DEFAULT false,
    "halfDayPeriod" "HalfDayPeriod",
    "reason" TEXT,
    "attachments" JSONB,
    "substituteUserId" INTEGER,
    "substituteStartDate" TIMESTAMP(3),
    "substituteEndDate" TIMESTAMP(3),
    "substituteConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "contactDuringLeave" TEXT,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'pending_manager',
    "managerId" INTEGER,
    "managerApprovalDate" TIMESTAMP(3),
    "managerNotes" TEXT,
    "hrOfficerId" INTEGER,
    "hrApprovalDate" TIMESTAMP(3),
    "hrNotes" TEXT,
    "submittedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_annual_holidays" (
    "id" SERIAL NOT NULL,
    "holidayName" TEXT NOT NULL,
    "holidayType" "HolidayType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrencePattern" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_annual_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "action" "ActivityAction" NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "description" TEXT,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "recipientId" INTEGER NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'system',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updatedById" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE INDEX "departments_parentId_idx" ON "departments"("parentId");

-- CreateIndex
CREATE INDEX "departments_managerId_idx" ON "departments"("managerId");

-- CreateIndex
CREATE UNIQUE INDEX "wso_sys_users_userLogin_key" ON "wso_sys_users"("userLogin");

-- CreateIndex
CREATE UNIQUE INDEX "wso_sys_users_email_key" ON "wso_sys_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "wso_sys_users_employeeNo_key" ON "wso_sys_users"("employeeNo");

-- CreateIndex
CREATE INDEX "wso_sys_users_departmentId_idx" ON "wso_sys_users"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "wso_roles_code_key" ON "wso_roles"("code");

-- CreateIndex
CREATE INDEX "wso_users_roles_roleId_idx" ON "wso_users_roles"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "wso_users_roles_userId_roleId_key" ON "wso_users_roles"("userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "role_permissions_permissionId_idx" ON "role_permissions"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON "role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "hr_leave_types_leaveTypeCode_key" ON "hr_leave_types"("leaveTypeCode");

-- CreateIndex
CREATE INDEX "hr_leave_balance_leaveTypeId_year_idx" ON "hr_leave_balance"("leaveTypeId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "hr_leave_balance_userId_leaveTypeId_year_key" ON "hr_leave_balance"("userId", "leaveTypeId", "year");

-- CreateIndex
CREATE INDEX "hr_leave_balance_history_balanceId_idx" ON "hr_leave_balance_history"("balanceId");

-- CreateIndex
CREATE INDEX "hr_leave_balance_history_changedById_idx" ON "hr_leave_balance_history"("changedById");

-- CreateIndex
CREATE UNIQUE INDEX "hr_leave_requests_requestNumber_key" ON "hr_leave_requests"("requestNumber");

-- CreateIndex
CREATE INDEX "hr_leave_requests_userId_status_idx" ON "hr_leave_requests"("userId", "status");

-- CreateIndex
CREATE INDEX "hr_leave_requests_managerId_status_idx" ON "hr_leave_requests"("managerId", "status");

-- CreateIndex
CREATE INDEX "hr_leave_requests_hrOfficerId_status_idx" ON "hr_leave_requests"("hrOfficerId", "status");

-- CreateIndex
CREATE INDEX "hr_leave_requests_leaveTypeId_idx" ON "hr_leave_requests"("leaveTypeId");

-- CreateIndex
CREATE INDEX "hr_annual_holidays_startDate_endDate_idx" ON "hr_annual_holidays"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "activity_logs_userId_idx" ON "activity_logs"("userId");

-- CreateIndex
CREATE INDEX "activity_logs_entityType_entityId_idx" ON "activity_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "activity_logs_action_idx" ON "activity_logs"("action");

-- CreateIndex
CREATE INDEX "notifications_recipientId_isRead_idx" ON "notifications"("recipientId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "wso_sys_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wso_sys_users" ADD CONSTRAINT "wso_sys_users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wso_users_roles" ADD CONSTRAINT "wso_users_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "wso_sys_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wso_users_roles" ADD CONSTRAINT "wso_users_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "wso_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "wso_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_leave_balance" ADD CONSTRAINT "hr_leave_balance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "wso_sys_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_leave_balance" ADD CONSTRAINT "hr_leave_balance_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "hr_leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_leave_balance_history" ADD CONSTRAINT "hr_leave_balance_history_balanceId_fkey" FOREIGN KEY ("balanceId") REFERENCES "hr_leave_balance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_leave_balance_history" ADD CONSTRAINT "hr_leave_balance_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "wso_sys_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_leave_requests" ADD CONSTRAINT "hr_leave_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "wso_sys_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_leave_requests" ADD CONSTRAINT "hr_leave_requests_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "hr_leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_leave_requests" ADD CONSTRAINT "hr_leave_requests_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "wso_sys_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_leave_requests" ADD CONSTRAINT "hr_leave_requests_hrOfficerId_fkey" FOREIGN KEY ("hrOfficerId") REFERENCES "wso_sys_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_leave_requests" ADD CONSTRAINT "hr_leave_requests_substituteUserId_fkey" FOREIGN KEY ("substituteUserId") REFERENCES "wso_sys_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "wso_sys_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "wso_sys_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
