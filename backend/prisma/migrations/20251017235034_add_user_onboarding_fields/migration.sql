-- CreateEnum
CREATE TYPE "PoliticaConfirmacao" AS ENUM ('manual', 'automatica');

-- AlterTable
ALTER TABLE "User"
    ADD COLUMN "horarios" JSONB,
    ADD COLUMN "nome_do_negocio" TEXT,
    ADD COLUMN "onboarding_incompleto" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "politica_confirmacao" "PoliticaConfirmacao" NOT NULL DEFAULT 'manual',
    ADD COLUMN "servicos" TEXT[] DEFAULT ARRAY[]::TEXT[];
