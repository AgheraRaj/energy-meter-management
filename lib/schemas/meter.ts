import { z } from "zod";

export const meterFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  location: z.string().optional(),
  status: z.enum(["active", "offline", "maintenance"]),
  minPowerKw: z.coerce.number().optional().or(z.literal("")),
  maxPowerKw: z.coerce.number().optional().or(z.literal("")),
});

export type MeterFormInput = z.input<typeof meterFormSchema>;   // shape while the user is typing
export type MeterFormValues = z.output<typeof meterFormSchema>; // shape after zod parses/coerces it