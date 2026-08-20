import { PrismaClient, Meter } from "./generated/prisma/client";
import { evaluateThresholds } from "./alerts";

interface IngestReadingInput {
  voltage: number;
  current: number;
  powerKw: number;
  energyKwh: number;
  thd?: number | null;
  powerFactor?: number | null;
  frequencyHz?: number | null;
  apparentPowerKva?: number | null;
  voltageR?: number | null;
  voltageY?: number | null;
  voltageB?: number | null;
  currentR?: number | null;
  currentY?: number | null;
  currentB?: number | null;
  powerKwR?: number | null;
  powerKwY?: number | null;
  powerKwB?: number | null;
  recordedAt?: Date;
}

// The single place a Reading row gets created — DB write, live socket push, and
// threshold evaluation all happen from here, regardless of source (simulator or
// real hardware via the RUT906 webhook). Mirrors the createAlert() pattern.
export async function ingestReading(
  prisma: PrismaClient,
  meter: Pick<Meter, "id" | "name" | "type" | "maxPowerKw" | "minPowerKw" | "status" | "alarmSetpointKva" | "alertSetpointKva">,
  input: IngestReadingInput
) {
  // Derive kVA/PF from voltage & current when the source doesn't report them
  // directly — same √3·V·I/1000 convention used elsewhere in the app (see
  // lib/transformer.ts). A meter sending real PF/kVA values takes priority.
  const apparentPowerKva =
    input.apparentPowerKva ?? Number(((Math.sqrt(3) * input.voltage * input.current) / 1000).toFixed(3));
  const powerFactor =
    input.powerFactor ?? (apparentPowerKva > 0 ? Number(Math.min(1, input.powerKw / apparentPowerKva).toFixed(3)) : null);

  const reading = await prisma.reading.create({
    data: {
      meterId: meter.id,
      voltage: input.voltage,
      current: input.current,
      powerKw: input.powerKw,
      energyKwh: input.energyKwh,
      thd: input.thd ?? null,
      powerFactor,
      frequencyHz: input.frequencyHz ?? null, // no fabricated fallback — null means genuinely unknown
      apparentPowerKva,
      voltageR: input.voltageR ?? null,
      voltageY: input.voltageY ?? null,
      voltageB: input.voltageB ?? null,
      currentR: input.currentR ?? null,
      currentY: input.currentY ?? null,
      currentB: input.currentB ?? null,
      powerKwR: input.powerKwR ?? null,
      powerKwY: input.powerKwY ?? null,
      powerKwB: input.powerKwB ?? null,
      recordedAt: input.recordedAt ?? new Date(),
    },
  });

  const io = (global as any).io;
  if (io) io.emit("reading:new", reading);

  await evaluateThresholds(prisma, meter, reading);

  return reading;
}