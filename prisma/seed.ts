import { prisma } from "@/lib/prisma";

async function main() {
  // Clear old data
  await prisma.notificationLog.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.reading.deleteMany();
  await prisma.meter.deleteMany();

  // Create Settings singleton
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      ratePerKwh: 8.5,
      alarmSetpointKw: 1400.0,
      alertSetpointKw: 1450.0,
      referenceCapacityKw: 1500.0,
    },
  });

  // Seed Transformers first to get their IDs
  const tr1 = await prisma.meter.create({
    data: {
      code: "TR-1",
      name: "Incomer Transformer 1",
      type: "transformer",
      bus: "BUS-1",
      feederCode: null,
      ratedKw: 1700,
      maxPowerKw: 1450,
      location: "Main Substation Sub-1",
      status: "active",
    },
  });

  const tr2 = await prisma.meter.create({
    data: {
      code: "TR-2",
      name: "Incomer Transformer 2",
      type: "transformer",
      bus: "BUS-2",
      feederCode: null,
      ratedKw: 1700,
      maxPowerKw: 1450,
      location: "Main Substation Sub-2",
      status: "active",
    },
  });

  // Seed Equipment meters with parent IDs
  const equipmentData = [
    { code: "CH-1", name: "Chiller 1", type: "equipment" as const, bus: "BUS-1", feederCode: "F1", ratedKw: 350, maxPowerKw: 315, location: "Utility Building", status: "active" as const, parentMeterId: tr1.id },
    { code: "ACP-1", name: "Air Compressor 1", type: "equipment" as const, bus: "BUS-1", feederCode: "F3", ratedKw: 132, maxPowerKw: 119, location: "Compressor Room", status: "active" as const, parentMeterId: tr1.id },
    { code: "CT-1", name: "Cooling Tower Fan 1", type: "equipment" as const, bus: "BUS-1", feederCode: "F5", ratedKw: 45, maxPowerKw: 41, location: "Cooling Tower Roof", status: "active" as const, parentMeterId: tr1.id },
    { code: "AHU-1", name: "Air Handling Unit", type: "equipment" as const, bus: "BUS-1", feederCode: "F7", ratedKw: 75, maxPowerKw: 68, location: "Main Office AHU Room", status: "active" as const, parentMeterId: tr1.id },
    { code: "PP-1", name: "Process Water Pump 1", type: "equipment" as const, bus: "BUS-1", feederCode: "F9", ratedKw: 110, maxPowerKw: 99, location: "Pump House", status: "active" as const, parentMeterId: tr1.id },
    { code: "LDB-1", name: "Lighting Distribution Board", type: "equipment" as const, bus: "BUS-1", feederCode: "F11", ratedKw: 60, maxPowerKw: 54, location: "Ground Floor Panel", status: "active" as const, parentMeterId: tr1.id },
    
    { code: "CH-2", name: "Chiller 2", type: "equipment" as const, bus: "BUS-2", feederCode: "F2", ratedKw: 350, maxPowerKw: 315, location: "Utility Building", status: "active" as const, parentMeterId: tr2.id },
    { code: "ACP-2", name: "Air Compressor 2", type: "equipment" as const, bus: "BUS-2", feederCode: "F4", ratedKw: 132, maxPowerKw: 119, location: "Compressor Room", status: "offline" as const, parentMeterId: tr2.id },
    { code: "CT-2", name: "Cooling Tower Fan 2", type: "equipment" as const, bus: "BUS-2", feederCode: "F6", ratedKw: 45, maxPowerKw: 41, location: "Cooling Tower Roof", status: "maintenance" as const, parentMeterId: tr2.id },
    { code: "BFP-1", name: "Boiler Feed Pump", type: "equipment" as const, bus: "BUS-2", feederCode: "F8", ratedKw: 90, maxPowerKw: 81, location: "Boiler House", status: "active" as const, parentMeterId: tr2.id },
    { code: "PP-2", name: "Process Water Pump 2", type: "equipment" as const, bus: "BUS-2", feederCode: "F10", ratedKw: 110, maxPowerKw: 99, location: "Pump House", status: "active" as const, parentMeterId: tr2.id },
    { code: "PL-1", name: "Production Line Motor Panel", type: "equipment" as const, bus: "BUS-2", feederCode: "F12", ratedKw: 180, maxPowerKw: 162, location: "Shop Floor", status: "active" as const, parentMeterId: tr2.id },
  ];

  const dbEquipment = [];
  for (const eq of equipmentData) {
    const dbEq = await prisma.meter.create({ data: eq });
    dbEquipment.push(dbEq);
  }

  const dbMeters = [tr1, tr2, ...dbEquipment];
  const readingData = [];
  const now = Date.now();
  const oneHourMs = 60 * 60 * 1000;

  const powerMapByHour: Record<number, Record<string, number>> = {};
  for (let hoursAgo = 47; hoursAgo >= 0; hoursAgo--) {
    powerMapByHour[hoursAgo] = { "TR-1": 0, "TR-2": 0 };
  }

  // Equipment readings
  for (const meter of dbEquipment) {
    if (meter.status !== "active") continue;

    const rated = meter.ratedKw ?? 100;
    const baseLoadFactor = 0.65 + Math.random() * 0.15;
    const pfBase = 0.85 + Math.random() * 0.1;
    let cumulativeEnergy = 500.0 + Math.random() * 2000.0;

    for (let hoursAgo = 47; hoursAgo >= 0; hoursAgo--) {
      const drift = 0.05 * Math.sin((hoursAgo / 6) * Math.PI);
      const loadFactor = Math.min(1.0, Math.max(0.4, baseLoadFactor + drift + (Math.random() - 0.5) * 0.05));
      const powerKw = Number((rated * loadFactor).toFixed(3));
      const voltage = Number((415 + (Math.random() - 0.5) * 5).toFixed(2));
      const pf = Math.min(0.99, Math.max(0.75, pfBase + (Math.random() - 0.5) * 0.02));
      const current = Number(((powerKw * 1000) / (Math.sqrt(3) * voltage * pf)).toFixed(2));

      const thd = Number((2.0 + Math.random() * 3.5).toFixed(2));

      cumulativeEnergy += powerKw;

      readingData.push({
        meterId: meter.id,
        voltage,
        current,
        powerKw,
        energyKwh: Number(cumulativeEnergy.toFixed(3)),
        thd,
        recordedAt: new Date(now - hoursAgo * oneHourMs),
      });

      // Track aggregate power under its parent transformer
      const parentCode = meter.parentMeterId === tr1.id ? "TR-1" : "TR-2";
      powerMapByHour[hoursAgo][parentCode] += powerKw;
    }
  }

  // Transformer readings
  const transformers = [tr1, tr2];
  for (const meter of transformers) {
    let cumulativeEnergy = 5000.0 + Math.random() * 10000.0;
    const pfBase = 0.88;

    for (let hoursAgo = 47; hoursAgo >= 0; hoursAgo--) {
      const activeEquipPower = powerMapByHour[hoursAgo][meter.code ?? ""] ?? 200.0;
      const powerKw = Number((activeEquipPower * 1.015).toFixed(3));
      const voltage = Number((415 + (Math.random() - 0.5) * 3).toFixed(2));
      const pf = Math.min(0.99, Math.max(0.82, pfBase + (Math.random() - 0.5) * 0.01));
      const current = Number(((powerKw * 1000) / (Math.sqrt(3) * voltage * pf)).toFixed(2));

      const thd = Number((1.5 + Math.random() * 2.0).toFixed(2));

      cumulativeEnergy += powerKw;

      readingData.push({
        meterId: meter.id,
        voltage,
        current,
        powerKw,
        energyKwh: Number(cumulativeEnergy.toFixed(3)),
        thd,
        recordedAt: new Date(now - hoursAgo * oneHourMs),
      });
    }
  }

  await prisma.reading.createMany({ data: readingData });

  console.log(`Seeded ${dbMeters.length} meters and ${readingData.length} readings successfully.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());