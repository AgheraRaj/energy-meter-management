-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('warning', 'critical');

-- AlterTable
ALTER TABLE "meters" ADD COLUMN     "max_power_kw" DOUBLE PRECISION,
ADD COLUMN     "min_power_kw" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "alerts" (
    "id" SERIAL NOT NULL,
    "meter_id" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'warning',
    "value" DOUBLE PRECISION NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alerts_meter_id_created_at_idx" ON "alerts"("meter_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_meter_id_fkey" FOREIGN KEY ("meter_id") REFERENCES "meters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
