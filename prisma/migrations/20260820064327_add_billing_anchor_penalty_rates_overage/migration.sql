-- AlterTable
ALTER TABLE "meters" ADD COLUMN     "alarm_setpoint_kva" DOUBLE PRECISION,
ADD COLUMN     "alert_setpoint_kva" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "billing_cycle_anchor_date" TIMESTAMP(3),
ADD COLUMN     "equipment_penalty_rate_per_kwh" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
ADD COLUMN     "transformer_penalty_rate_per_kvah" DOUBLE PRECISION NOT NULL DEFAULT 5.0;

-- CreateTable
CREATE TABLE "overage_events" (
    "id" SERIAL NOT NULL,
    "meter_id" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "last_sample_at" TIMESTAMP(3) NOT NULL,
    "threshold_value" DOUBLE PRECISION NOT NULL,
    "peak_value" DOUBLE PRECISION NOT NULL,
    "excess_unit_hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "overage_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "overage_events_meter_id_started_at_idx" ON "overage_events"("meter_id", "started_at" DESC);

-- AddForeignKey
ALTER TABLE "overage_events" ADD CONSTRAINT "overage_events_meter_id_fkey" FOREIGN KEY ("meter_id") REFERENCES "meters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
