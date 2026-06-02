import { Router } from "express";
import PDFDocument from "pdfkit";
import { UserRole } from "@prisma/client";
import { prisma } from "../prisma.js";
import { requireAuth, loadActiveUser } from "../middleware/auth.js";

export const reportsRouter = Router();

reportsRouter.get("/client-orders", requireAuth, loadActiveUser, async (req, res) => {
  if (req.authUser!.role !== UserRole.CLIENT) {
    res.status(403).json({ error: "Отчёт для заказчика" });
    return;
  }
  const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 90 * 86400000);
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();
  const orders = await prisma.order.findMany({
    where: {
      clientId: req.authUser!.id,
      createdAt: { gte: from, lte: to },
    },
    orderBy: { createdAt: "desc" },
    include: { translator: { select: { fullName: true } } },
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="orders-report.pdf"`);
  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(res);
  doc.fontSize(18).text("Отчёт по заказам заказчика", { underline: true });
  doc.moveDown();
  doc.fontSize(10).text(`Период: ${from.toLocaleDateString("ru-RU")} — ${to.toLocaleDateString("ru-RU")}`);
  doc.moveDown();
  orders.forEach((o, i) => {
    doc
      .fontSize(11)
      .text(
        `${i + 1}. ${o.title} | ${o.status} | ${o.agreedPrice != null ? Number(o.agreedPrice) + " " + o.currency : "—"} | исп.: ${o.translator?.fullName ?? "—"}`,
      );
  });
  doc.end();
});

reportsRouter.get("/translator-income", requireAuth, loadActiveUser, async (req, res) => {
  if (req.authUser!.role !== UserRole.TRANSLATOR) {
    res.status(403).json({ error: "Отчёт для переводчика" });
    return;
  }
  const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 90 * 86400000);
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();
  const orders = await prisma.order.findMany({
    where: {
      translatorId: req.authUser!.id,
      status: "COMPLETED",
      completedAt: { gte: from, lte: to },
    },
    include: { payment: true },
  });
  const sum = orders.reduce((a, o) => a + (o.agreedPrice ? Number(o.agreedPrice) : 0), 0);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="income-report.pdf"`);
  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(res);
  doc.fontSize(18).text("Отчёт по доходам переводчика", { underline: true });
  doc.moveDown();
  doc.fontSize(10).text(`Период: ${from.toLocaleDateString("ru-RU")} — ${to.toLocaleDateString("ru-RU")}`);
  doc.fontSize(12).text(`Итого по завершённым заказам: ${sum.toFixed(2)} RUB`);
  doc.moveDown();
  orders.forEach((o, i) => {
    doc.fontSize(11).text(`${i + 1}. ${o.title} | ${o.completedAt?.toLocaleDateString("ru-RU")} | ${Number(o.agreedPrice ?? 0)} RUB`);
  });
  doc.end();
});
