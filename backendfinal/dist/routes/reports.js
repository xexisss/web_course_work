import { Router } from "express";
import { UserRole } from "@prisma/client";
import { prisma } from "../prisma.js";
import { requireAuth, loadActiveUser } from "../middleware/auth.js";
import { createPdfDocument, pdfBody, pdfTitle } from "../services/pdf.js";
export const reportsRouter = Router();
const STATUS_LABELS = {
    DRAFT: "Черновик",
    SUBMITTED: "Опубликован",
    PENDING_TRANSLATOR: "Ожидает исполнителя",
    ACCEPTED: "Принят",
    IN_PROGRESS: "В работе",
    DELIVERED: "Сдано",
    COMPLETED: "Завершён",
    CANCELLED: "Отменён",
    DISPUTED: "Спор",
};
function formatMoney(amount, currency = "BYN") {
    if (amount == null)
        return "—";
    return `${Number(amount).toFixed(2)} ${currency === "BYN" ? "бел. руб." : currency}`;
}
reportsRouter.get("/client-orders", requireAuth, loadActiveUser, async (req, res) => {
    if (req.authUser.role !== UserRole.CLIENT) {
        res.status(403).json({ error: "Отчёт для заказчика" });
        return;
    }
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 90 * 86400000);
    const to = req.query.to ? new Date(String(req.query.to)) : new Date();
    const orders = await prisma.order.findMany({
        where: {
            clientId: req.authUser.id,
            createdAt: { gte: from, lte: to },
        },
        orderBy: { createdAt: "desc" },
        include: { translator: { select: { fullName: true } } },
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="orders-report.pdf"`);
    const doc = createPdfDocument(res);
    pdfTitle(doc, "Отчёт по заказам заказчика");
    doc.moveDown();
    pdfBody(doc, 10).text(`Период: ${from.toLocaleDateString("ru-RU")} — ${to.toLocaleDateString("ru-RU")}`);
    doc.moveDown();
    orders.forEach((o, i) => {
        pdfBody(doc, 11).text(`${i + 1}. ${o.title} | ${STATUS_LABELS[o.status] ?? o.status} | ${formatMoney(o.agreedPrice != null ? Number(o.agreedPrice) : null, o.currency)} | исп.: ${o.translator?.fullName ?? "—"}`);
    });
    doc.end();
});
reportsRouter.get("/translator-income", requireAuth, loadActiveUser, async (req, res) => {
    if (req.authUser.role !== UserRole.TRANSLATOR) {
        res.status(403).json({ error: "Отчёт для переводчика" });
        return;
    }
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 90 * 86400000);
    const to = req.query.to ? new Date(String(req.query.to)) : new Date();
    const orders = await prisma.order.findMany({
        where: {
            translatorId: req.authUser.id,
            status: "COMPLETED",
            completedAt: { gte: from, lte: to },
        },
        include: { payment: true },
    });
    const sum = orders.reduce((a, o) => a + (o.agreedPrice ? Number(o.agreedPrice) : 0), 0);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="income-report.pdf"`);
    const doc = createPdfDocument(res);
    pdfTitle(doc, "Отчёт по доходам переводчика");
    doc.moveDown();
    pdfBody(doc, 10).text(`Период: ${from.toLocaleDateString("ru-RU")} — ${to.toLocaleDateString("ru-RU")}`);
    pdfBody(doc, 12).text(`Итого по завершённым заказам: ${sum.toFixed(2)} бел. руб.`);
    doc.moveDown();
    orders.forEach((o, i) => {
        pdfBody(doc, 11).text(`${i + 1}. ${o.title} | ${o.completedAt?.toLocaleDateString("ru-RU") ?? "—"} | ${formatMoney(Number(o.agreedPrice ?? 0), o.currency)}`);
    });
    doc.end();
});
