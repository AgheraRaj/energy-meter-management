import { PrismaClient, Meter } from "./generated/prisma/client";
import { evaluateThresholds } from "./alerts";

interface IngestReadingInput {
  voltage: number;
  current: number;
  powerKw: number;
  energyKwh: number;
  thd?: number | null;
  recordedAt?: Date;
}

// The single place a Reading row gets created — DB write, live socket push, and
// threshold evaluation all happen from here, regardless of source (simulator or
// real hardware via the RUT906 webhook). Mirrors the createAlert() pattern.
export async function ingestReading(
  prisma: PrismaClient,
  meter: Pick<Meter, "id" | "name" | "maxPowerKw" | "minPowerKw" | "status">,
  input: IngestReadingInput
) {
  const reading = await prisma.reading.create({
    data: {
      meterId: meter.id,
      voltage: input.voltage,
      current: input.current,
      powerKw: input.powerKw,
      energyKwh: input.energyKwh,
      thd: input.thd ?? null,
      recordedAt: input.recordedAt ?? new Date(),
    },
  });

  const io = (global as any).io;
  if (io) io.emit("reading:new", reading);

  await evaluateThresholds(prisma, meter, reading);

  return reading;
}