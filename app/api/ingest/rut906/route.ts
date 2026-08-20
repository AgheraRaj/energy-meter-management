import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { ingestReading } from "@/lib/readings";
import { rut906RequestSchema } from "@/lib/schemas/rut906";

function isAuthorized(request: NextRequest): boolean {
  const provided = request.headers.get("x-api-key") ?? "";
  const expected = process.env.RUT906_API_KEY ?? "";
  if (!expected || provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.text();
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    console.error("RUT906 webhook: received non-JSON body:", rawBody.slice(0, 500));
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = rut906RequestSchema.safeParse(json);
  if (!parsed.success) {
    console.error("RUT906 webhook: payload failed validation:", JSON.stringify(parsed.error.issues), "raw:", rawBody.slice(0, 500));
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.issues }, { status: 400 });
  }

  const { readings } = parsed.data.data; // unwrap the "data" envelope once, here

  const results: { meterCode: string; status: "accepted" | "skipped"; reason?: string }[] = [];

  for (const item of readings) {
    const meter = await prisma.meter.findFirst({ where: { code: item.meterCode } });

    if (!meter) {
      results.push({ meterCode: item.meterCode, status: "skipped", reason: "Unknown meter code" });
      continue;
    }

    await ingestReading(prisma, meter, {
      voltage: item.voltage,
      current: item.current,
      powerKw: item.powerKw,
      energyKwh: item.energyKwh,
      thd: item.thd,
      powerFactor: item.powerFactor,
      frequencyHz: item.frequencyHz,
      apparentPowerKva: item.apparentPowerKva,
      voltageR: item.voltageR,
      voltageY: item.voltageY,
      voltageB: item.voltageB,
      currentR: item.currentR,
      currentY: item.currentY,
      currentB: item.currentB,
      powerKwR: item.powerKwR,
      powerKwY: item.powerKwY,
      powerKwB: item.powerKwB,
      recordedAt: item.recordedAt ? new Date(item.recordedAt) : undefined,
    });

    results.push({ meterCode: item.meterCode, status: "accepted" });
  }

  return NextResponse.json({ processed: results.length, results }, { status: 200 });
}