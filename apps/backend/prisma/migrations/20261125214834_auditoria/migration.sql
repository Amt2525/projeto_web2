-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_occurred_at_idx" ON "audit_logs"("occurred_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_occurred_at_idx" ON "audit_logs"("user_id", "occurred_at");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Restrições escritas à mão.
-- O código da ação é sempre MAIÚSCULAS_COM_SUBLINHADO (ex.: LOGIN_FALHA) e curto.
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_action_formato_check"
  CHECK ("action" ~ '^[A-Z][A-Z_]{1,49}$');
-- Registros de auditoria não devem crescer sem limite por campo.
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_agent_tamanho_check"
  CHECK ("user_agent" IS NULL OR char_length("user_agent") <= 200);
