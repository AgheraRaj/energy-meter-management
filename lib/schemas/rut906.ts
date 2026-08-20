import { z } from "zod";

export const rut906ReadingSchema = z.object({
  meterCode: z.string().min(1),
  voltage: z.number().positive(),
  current: z.number().nonnegative(),
  powerKw: z.number(),
  energyKwh: z.number().nonnegative(),
  thd: z.number().nonnegative().optional(),
  powerFactor: z.number().min(0).max(1).optional(),
  frequencyHz: z.number().positive().optional(),
  apparentPowerKva: z.number().nonnegative().optional(),
  voltageR: z.number().nonnegative().optional(),
  voltageY: z.number().nonnegative().optional(),
  voltageB: z.number().nonnegative().optional(),
  currentR: z.number().nonnegative().optional(),
  currentY: z.number().nonnegative().optional(),
  currentB: z.number().nonnegative().optional(),
  powerKwR: z.number().optional(),
  powerKwY: z.number().optional(),
  powerKwB: z.number().optional(),
  recordedAt: z.string().datetime().optional(),
});

export const rut906PayloadSchema = z.object({
  deviceId: z.string().optional(),
  readings: z.array(rut906ReadingSchema).min(1).max(50),
});

// The actual request body wraps the payload under a "data" key.
export const rut906RequestSchema = z.object({
  data: rut906PayloadSchema,
});