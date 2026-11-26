-- CreateTable
CREATE TABLE "plants" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "capacity_wp" INTEGER NOT NULL,
    "city" TEXT NOT NULL,
    "state" CHAR(2) NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "installed_on" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "plants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plants_is_active_name_idx" ON "plants"("is_active", "name");

-- CreateIndex
CREATE INDEX "plants_state_idx" ON "plants"("state");

-- AddForeignKey
ALTER TABLE "plants" ADD CONSTRAINT "plants_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Restrições escritas à mão (a API valida, mas o banco é a última barreira).
-- Textos já limpos (sem espaços nas pontas) e com tamanho dentro do limite.
ALTER TABLE "plants" ADD CONSTRAINT "plants_name_check"
  CHECK ("name" = btrim("name") AND char_length("name") BETWEEN 3 AND 120);
ALTER TABLE "plants" ADD CONSTRAINT "plants_client_name_check"
  CHECK ("client_name" = btrim("client_name") AND char_length("client_name") BETWEEN 2 AND 120);
ALTER TABLE "plants" ADD CONSTRAINT "plants_city_check"
  CHECK ("city" = btrim("city") AND char_length("city") BETWEEN 2 AND 100);
-- Capacidade em Wp: positiva e até 100.000 kWp (= 100.000.000 Wp).
ALTER TABLE "plants" ADD CONSTRAINT "plants_capacity_wp_check"
  CHECK ("capacity_wp" > 0 AND "capacity_wp" <= 100000000);
-- Só as 27 UFs.
ALTER TABLE "plants" ADD CONSTRAINT "plants_state_check"
  CHECK ("state" IN ('AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'));
-- Coordenadas dentro do intervalo, e sempre as duas juntas (ou nenhuma).
-- Atenção: com NULL, BETWEEN dá NULL e o CHECK deixaria passar; por isso o IS NOT NULL explícito.
ALTER TABLE "plants" ADD CONSTRAINT "plants_coordenadas_check"
  CHECK (
    ("latitude" IS NULL AND "longitude" IS NULL)
    OR (
      "latitude" IS NOT NULL AND "longitude" IS NOT NULL
      AND "latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180
    )
  );

-- Duplicidade: mesmo nome (sem diferenciar maiúsculas) na mesma cidade e UF.
-- O Prisma não sabe descrever índices com expressão, por isso este índice só existe aqui no SQL.
CREATE UNIQUE INDEX "plants_nome_cidade_uf_key" ON "plants" (lower("name"), lower("city"), "state");
