-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');

-- CreateEnum
CREATE TYPE "AppointmentSource" AS ENUM ('manual', 'online', 'imported', 'integration');

-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday');

-- CreateEnum
CREATE TYPE "BlockType" AS ENUM ('manual', 'lunch', 'maintenance', 'holiday', 'other');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('pix', 'cash', 'credit_card', 'debit_card', 'transfer', 'voucher', 'other');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'received', 'refunded', 'cancelled');

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration_minutes" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "buffer_before" INTEGER NOT NULL DEFAULT 0,
    "buffer_after" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "service_id" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'pending',
    "price" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "source" "AppointmentSource" NOT NULL DEFAULT 'manual',
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkingHours" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "day_of_week" "Weekday" NOT NULL,
    "start_minutes" INTEGER NOT NULL,
    "end_minutes" INTEGER NOT NULL,
    "break_windows" JSONB,
    "time_zone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkingHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "type" "BlockType" NOT NULL DEFAULT 'manual',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRecord" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "customer_id" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "method" "PaymentMethod" NOT NULL DEFAULT 'pix',
    "status" "PaymentStatus" NOT NULL DEFAULT 'received',
    "description" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "received_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_customer_provider" ON "Customer"("provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_customer_email_per_provider" ON "Customer"("provider_id", "email");

-- CreateIndex
CREATE INDEX "idx_service_provider" ON "Service"("provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_service_name_per_provider" ON "Service"("provider_id", "name");

-- CreateIndex
CREATE INDEX "idx_appointment_provider" ON "Appointment"("provider_id");

-- CreateIndex
CREATE INDEX "idx_appointment_provider_start" ON "Appointment"("provider_id", "starts_at");

-- CreateIndex
CREATE INDEX "idx_appointment_customer" ON "Appointment"("customer_id");

-- CreateIndex
CREATE INDEX "idx_working_hours_provider" ON "WorkingHours"("provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_working_hours_day" ON "WorkingHours"("provider_id", "day_of_week");

-- CreateIndex
CREATE INDEX "idx_block_provider" ON "Block"("provider_id");

-- CreateIndex
CREATE INDEX "idx_block_timerange" ON "Block"("provider_id", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "idx_payment_provider" ON "PaymentRecord"("provider_id");

-- CreateIndex
CREATE INDEX "idx_payment_appointment" ON "PaymentRecord"("appointment_id");

-- CreateIndex
CREATE INDEX "idx_payment_customer" ON "PaymentRecord"("customer_id");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkingHours" ADD CONSTRAINT "WorkingHours_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
