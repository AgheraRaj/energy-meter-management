/*
  Warnings:

  - You are about to drop the column `feeder` on the `meters` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "meters" DROP COLUMN "feeder",
ADD COLUMN     "feeder_code" TEXT,
ADD COLUMN     "parent_meter_id" INTEGER;

-- AlterTable
ALTER TABLE "readings" ADD COLUMN     "thd" DOUBLE PRECISION;

-- AddForeignKey
ALTER TABLE "meters" ADD CONSTRAINT "meters_parent_meter_id_fkey" FOREIGN KEY ("parent_meter_id") REFERENCES "meters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
