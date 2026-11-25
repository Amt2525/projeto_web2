-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('ADMIN', 'TECNICO');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'TECNICO',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- Restrições de integridade escritas à mão (o Prisma não as gera sozinho).
-- Elas valem para qualquer programa que escreva no banco, não só para a nossa API.
-- E-mail sempre em minúsculas: impede "Ana@x.com" e "ana@x.com" como contas diferentes.
ALTER TABLE "users" ADD CONSTRAINT "users_email_minusculo_check"
  CHECK ("email" = lower("email"));
ALTER TABLE "users" ADD CONSTRAINT "users_email_tamanho_check"
  CHECK (char_length("email") BETWEEN 3 AND 254);
ALTER TABLE "users" ADD CONSTRAINT "users_name_tamanho_check"
  CHECK (char_length(btrim("name")) BETWEEN 1 AND 120);
ALTER TABLE "users" ADD CONSTRAINT "users_password_hash_preenchido_check"
  CHECK (char_length("password_hash") > 0);
