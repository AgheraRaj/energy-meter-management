-- CreateTable
CREATE TABLE "settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "rate_per_kwh" DOUBLE PRECISION NOT NULL DEFAULT 8.5,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);
