require("dotenv/config");
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const { prisma } = require("./lib/prisma");
const { evaluateThresholds } = require("./lib/alerts");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res, parse(req.url, true));
  });

  const io = new Server(httpServer);

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
  });

  // Placeholder ingestion: swap this block for real meter polling later.
  // The io.emit() call below is the only line that matters to the frontend.
  setInterval(async () => {
    const meters = await prisma.meter.findMany({ where: { status: "active" } });

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

      const reading = await prisma.reading.create({
        data: {
          meterId: meter.id,
          voltage,
          current,
          powerKw,
          energyKwh,
          recordedAt: new Date(),
        },
      });

      io.emit("reading:new", reading);
      const alerts = await evaluateThresholds(prisma, meter, reading);

      for (const alert of alerts) {
        io.emit("alert:new", alert);
      }

      for (const alert of alerts) {
        io.emit("alert:new", { ...alert, meter: { name: meter.name } });
      }
    }
  }, 5000);

  httpServer.listen(3000, () =>
    console.log("> Ready on http://localhost:3000"),
  );
});
