-- CreateEnum
CREATE TYPE "MeterType" AS ENUM ('transformer', 'equipment');

-- AlterTable
ALTER TABLE "meters" ADD COLUMN     "bus" TEXT,
ADD COLUMN     "code" TEXT,
ADD COLUMN     "feeder" TEXT,
ADD COLUMN     "rated_kw" DOUBLE PRECISION,
ADD COLUMN     "type" "MeterType" NOT NULL DEFAULT 'equipment';

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "alarm_setpoint_kw" DOUBLE PRECISION NOT NULL DEFAULT 1400.0,
ADD COLUMN     "alert_setpoint_kw" DOUBLE PRECISION NOT NULL DEFAULT 1450.0,
ADD COLUMN     "reference_capacity_kw" DOUBLE PRECISION NOT NULL DEFAULT 1500.0;
