-- CreateTable
CREATE TABLE "notification_logs" (
    "id" SERIAL NOT NULL,
    "alert_id" INTEGER NOT NULL,
    "meter_id" INTEGER NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "status" TEXT NOT NULL,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_logs_meter_id_channel_created_at_idx" ON "notification_logs"("meter_id", "channel", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
