import { z } from "zod";

export const rut906ReadingSchema = z.object({
  meterCode: z.string().min(1),
  voltage: z.number().positive(),
  current: z.number().nonnegative(),
  powerKw: z.number(),
  energyKwh: z.number().nonnegative(),
  thd: z.number().nonnegative().optional(),
  recordedAt: z.string().datetime().optional(),
});

export const rut906PayloadSchema = z.object({
  deviceId: z.string().optional(),
  readings: z.array(rut906ReadingSchema).min(1).max(50),
});