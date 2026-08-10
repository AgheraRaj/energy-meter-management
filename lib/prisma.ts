import "dotenv/config";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

interface GlobalPrisma {
  prisma?: PrismaClient;
}

const globalForPrisma = globalThis as unknown as GlobalPrisma;

const prismaAdapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const shouldResetPrisma =
  globalForPrisma.prisma !== undefined &&
  (
    typeof globalForPrisma.prisma.alert === "undefined" ||
    typeof globalForPrisma.prisma.settings === "undefined" ||
    typeof globalForPrisma.prisma.meter === "undefined" ||
    typeof globalForPrisma.prisma.reading === "undefined"
  );

const prisma =
  globalForPrisma.prisma && !shouldResetPrisma
    ? globalForPrisma.prisma
    : new PrismaClient({ adapter: prismaAdapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { prisma };