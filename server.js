require("dotenv/config");
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const { prisma } = require("./lib/prisma");
const { evaluateThresholds } = require("./lib/alerts");
const { ingestReading } = require("./lib/readings");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const SIMULATOR_ENABLED = process.env.SIMULATOR_ENABLED === "true";

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res, parse(req.url, true));
  });

  const io = new Server(httpServer);
  global.io = io; // exposes io to Next.js API routes for emitting events outside the socket layer

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
  });

  if (SIMULATOR_ENABLED) {
    setInterval(async () => {
      const meters = await prisma.meter.findMany({
        where: { status: "active", type: "equipment" },
      });

      for (const meter of meters) {
        const last = await prisma.reading.findFirst({
          where: { meterId: meter.id },
          orderBy: { recordedAt: "desc" },
        });

        const powerKw = Number(
          ((last?.powerKw ?? 2.5) + (Math.random() - 0.5) * 0.5).toFixed(3),
        );
        const voltage = Number((228 + (Math.random() - 0.5) * 4).toFixed(2));
        const current = Number(((powerKw * 1000) / voltage).toFixed(2));
        const energyKwh = Number(
          ((last?.energyKwh ?? 0) + powerKw / 720).toFixed(3),
        );

        await ingestReading(prisma, meter, {
          voltage,
          current,
          powerKw,
          energyKwh,
          thd: last?.thd ?? null,
          powerFactor: last?.powerFactor ?? null,
          frequencyHz: last?.frequencyHz ?? null,
          apparentPowerKva: last?.apparentPowerKva ?? null,
          voltageR: last?.voltageR ?? null,
          voltageY: last?.voltageY ?? null,
          voltageB: last?.voltageB ?? null,
          currentR: last?.currentR ?? null,
          currentY: last?.currentY ?? null,
          currentB: last?.currentB ?? null,
          powerKwR: last?.powerKwR ?? null,
          powerKwY: last?.powerKwY ?? null,
          powerKwB: last?.powerKwB ?? null,
        });
      }
    }, 5000);
    console.log("Simulator: ON — generating readings every 5s");
  } else {
    console.log(
      "Simulator: OFF — waiting for real RUT906 data via /api/ingest/rut906",
    );
  }

  httpServer.listen(3000, () =>
    console.log("> Ready on http://localhost:3000"),
  );
});
