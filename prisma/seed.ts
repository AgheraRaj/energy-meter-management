import { prisma } from "@/lib/prisma";

async function main() {
  await prisma.reading.deleteMany();
  await prisma.meter.deleteMany();
  await prisma.settings.upsert({
  where: { id: 1 },
  update: {},
  create: { id: 1, ratePerKwh: 8.5 },
});

  const meters = await Promise.all([
    prisma.meter.create({ data: { name: "Main Panel", location: "Ground Floor", status: "active" } }),
    prisma.meter.create({ data: { name: "HVAC Unit", location: "Rooftop", status: "active" } }),
    prisma.meter.create({ data: { name: "Server Room", location: "Basement", status: "offline" } }),
    prisma.meter.create({ data: { name: "Workshop", location: "Annex", status: "maintenance" } }),
  ]);

  const readingData = [];
  const now = Date.now();

  for (const meter of meters) {
    if (meter.status === "offline") continue; // no fresh data for an offline meter

    // baseline values per meter so each one looks distinct, not random noise
    const baseVoltage = 225 + Math.random() * 10;
    const basePower = meter.name === "HVAC Unit" ? 4 : meter.name === "Workshop" ? 1.5 : 2.8;
    let cumulativeEnergy = 50 + Math.random() * 100;

    // 48 hourly readings = 2 days of history, enough to plot a trend later
    for (let hoursAgo = 47; hoursAgo >= 0; hoursAgo--) {
      const powerKw = Number((basePower + (Math.random() - 0.5) * 0.8).toFixed(3));
      const voltage = Number((baseVoltage + (Math.random() - 0.5) * 3).toFixed(2));
      const current = Number(((powerKw * 1000) / voltage).toFixed(2));
      cumulativeEnergy += powerKw; // roughly 1kWh added per hour at powerKw draw

      readingData.push({
        meterId: meter.id,
        voltage,
        current,
        powerKw,
        energyKwh: Number(cumulativeEnergy.toFixed(3)),
        recordedAt: new Date(now - hoursAgo * 60 * 60 * 1000),
      });
    }
  }

  await prisma.reading.createMany({ data: readingData });

  console.log(`Seeded ${meters.length} meters and ${readingData.length} readings.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());