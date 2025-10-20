-- Add timezone and phone fields to the User aggregate root
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

-- Ensure existing records have a timezone
UPDATE "User"
SET "timezone" = 'America/Sao_Paulo'
WHERE "timezone" IS NULL;

-- Maintain default for future inserts
ALTER TABLE "User" ALTER COLUMN "timezone" SET DEFAULT 'America/Sao_Paulo';

-- Guarantee unique phone numbers when present
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
