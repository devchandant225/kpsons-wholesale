-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_INFO');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'REP');

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wholesale_applications" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "dba" TEXT NOT NULL DEFAULT '',
    "business_phone" TEXT NOT NULL DEFAULT '',
    "address_line1" TEXT NOT NULL,
    "address_line2" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postal_code" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'US',
    "billing_same_as_business" BOOLEAN NOT NULL DEFAULT true,
    "billing_name" TEXT NOT NULL DEFAULT '',
    "billing_line1" TEXT NOT NULL DEFAULT '',
    "billing_line2" TEXT NOT NULL DEFAULT '',
    "billing_city" TEXT NOT NULL DEFAULT '',
    "billing_state" TEXT NOT NULL DEFAULT '',
    "billing_postal_code" TEXT NOT NULL DEFAULT '',
    "billing_country" TEXT NOT NULL DEFAULT 'US',
    "documents" JSONB NOT NULL DEFAULT '{}',
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "shopify_customer_id" TEXT,
    "assigned_sales_rep" TEXT NOT NULL DEFAULT '',
    "admin_notes" TEXT NOT NULL DEFAULT '',
    "rejection_reason" TEXT NOT NULL DEFAULT '',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wholesale_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "wholesale_applications_email_key" ON "wholesale_applications"("email");

-- CreateIndex
CREATE INDEX "wholesale_applications_status_idx" ON "wholesale_applications"("status");

-- CreateIndex
CREATE INDEX "wholesale_applications_created_at_idx" ON "wholesale_applications"("created_at");

