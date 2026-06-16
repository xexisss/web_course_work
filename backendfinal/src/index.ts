import express from "express";
import cors from "cors";
import path from "node:path";
import { config } from "./config.js";
import { authRouter } from "./routes/auth.js";
import { catalogRouter } from "./routes/catalog.js";
import { notificationsRouter } from "./routes/notifications.js";
import { ordersRouter } from "./routes/orders.js";
import { adminRouter } from "./routes/admin.js";
import { reportsRouter } from "./routes/reports.js";
import { profileRouter } from "./routes/profile.js";

const app = express();
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "translator-platform-api" });
});

app.use("/api/auth", authRouter);
app.use("/api/catalog", catalogRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/profile", profileRouter);
app.use("/api/admin", adminRouter);
app.use("/api/reports", reportsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Не найдено" });
});

app.listen(config.port, () => {
  console.log(`API http://localhost:${config.port}`);
});
