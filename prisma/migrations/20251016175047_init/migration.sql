-- CreateEnum
CREATE TYPE "public"."TipoMaquina" AS ENUM ('LAVAR', 'SECAR');

-- CreateEnum
CREATE TYPE "public"."StatusReserva" AS ENUM ('PENDENTE', 'CONFIRMADA', 'RECUSADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "public"."lavanderias" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(60) NOT NULL,
    "foto" TEXT,
    "endereco" VARCHAR(120) NOT NULL,
    "qntMaquinas" INTEGER NOT NULL DEFAULT 0,
    "destaque" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lavanderias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."maquinas" (
    "id" SERIAL NOT NULL,
    "tipo" "public"."TipoMaquina" NOT NULL DEFAULT 'LAVAR',
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lavanderiaId" INTEGER NOT NULL,
    "adminId" VARCHAR(36),

    CONSTRAINT "maquinas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."clientes" (
    "id" VARCHAR(36) NOT NULL,
    "nome" VARCHAR(60) NOT NULL,
    "email" VARCHAR(40) NOT NULL,
    "senha" VARCHAR(60) NOT NULL,
    "telefone" VARCHAR(20),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reservas" (
    "id" SERIAL NOT NULL,
    "clienteId" VARCHAR(36) NOT NULL,
    "maquinaId" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "public"."StatusReserva" NOT NULL DEFAULT 'PENDENTE',
    "resposta" VARCHAR(255),
    "respondidaEm" TIMESTAMP(3),
    "adminId" VARCHAR(36),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."admins" (
    "id" VARCHAR(36) NOT NULL,
    "nome" VARCHAR(60) NOT NULL,
    "email" VARCHAR(40) NOT NULL,
    "senha" VARCHAR(60) NOT NULL,
    "nivel" SMALLINT NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."logs" (
    "id" SERIAL NOT NULL,
    "adminId" VARCHAR(36) NOT NULL,
    "descricao" VARCHAR(60) NOT NULL,
    "complemento" VARCHAR(200) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_AdminLavanderias" (
    "A" VARCHAR(36) NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_AdminLavanderias_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_email_key" ON "public"."clientes"("email");

-- CreateIndex
CREATE INDEX "reservas_clienteId_startsAt_idx" ON "public"."reservas"("clienteId", "startsAt");

-- CreateIndex
CREATE INDEX "reservas_maquinaId_startsAt_idx" ON "public"."reservas"("maquinaId", "startsAt");

-- CreateIndex
CREATE INDEX "reservas_status_startsAt_idx" ON "public"."reservas"("status", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "reservas_maquinaId_startsAt_key" ON "public"."reservas"("maquinaId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "public"."admins"("email");

-- CreateIndex
CREATE INDEX "_AdminLavanderias_B_index" ON "public"."_AdminLavanderias"("B");

-- AddForeignKey
ALTER TABLE "public"."maquinas" ADD CONSTRAINT "maquinas_lavanderiaId_fkey" FOREIGN KEY ("lavanderiaId") REFERENCES "public"."lavanderias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."maquinas" ADD CONSTRAINT "maquinas_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reservas" ADD CONSTRAINT "reservas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "public"."clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reservas" ADD CONSTRAINT "reservas_maquinaId_fkey" FOREIGN KEY ("maquinaId") REFERENCES "public"."maquinas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reservas" ADD CONSTRAINT "reservas_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."logs" ADD CONSTRAINT "logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_AdminLavanderias" ADD CONSTRAINT "_AdminLavanderias_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_AdminLavanderias" ADD CONSTRAINT "_AdminLavanderias_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."lavanderias"("id") ON DELETE CASCADE ON UPDATE CASCADE;
