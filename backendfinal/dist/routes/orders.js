import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { z } from "zod";
import { OrderStatus, OrderUrgency, UserRole, FileKind, BidStatus, Prisma, PaymentStatus } from "@prisma/client";
import { prisma } from "../prisma.js";
import { requireAuth, loadActiveUser } from "../middleware/auth.js";
import { estimateOrder } from "../services/pricing.js";
import { notifyUser } from "../services/notify.js";
import { config } from "../config.js";
import crypto from "node:crypto";
export const ordersRouter = Router();
function paramId(v) {
    if (Array.isArray(v))
        return v[0] ?? "";
    return typeof v === "string" ? v : "";
}
const orderDetailInclude = Prisma.validator()({
    client: { select: { id: true, fullName: true, email: true, phone: true } },
    translator: { select: { id: true, fullName: true, email: true, phone: true } },
    files: true,
    bids: {
        include: { translator: { select: { id: true, fullName: true, email: true } } },
        orderBy: { createdAt: "desc" },
    },
    messages: {
        include: { sender: { select: { id: true, fullName: true, role: true } } },
        orderBy: { createdAt: "asc" },
    },
    review: true,
    payment: true,
    complaints: { include: { author: { select: { id: true, fullName: true } } } },
});
const uploadDir = path.resolve(config.uploadDir);
if (!fs.existsSync(uploadDir))
    fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname) || "";
        cb(null, `${crypto.randomUUID()}${ext}`);
    },
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });
function assertOrderAccess(order, userId, role) {
    if (role === UserRole.ADMIN)
        return true;
    if (order.clientId === userId)
        return true;
    if (order.translatorId === userId)
        return true;
    return false;
}
/** Открытый заказ на витрине: переводчик может смотреть, скачать исходники и уточнить детали */
function isMarketTranslator(order, userId, role) {
    return (role === UserRole.TRANSLATOR &&
        order.clientId !== userId &&
        !order.translatorId &&
        (order.status === OrderStatus.SUBMITTED || order.status === OrderStatus.PENDING_TRANSLATOR));
}
function canViewOrder(order, userId, role) {
    return assertOrderAccess(order, userId, role) || isMarketTranslator(order, userId, role);
}
function canMessageOnOrder(order, userId, role) {
    return assertOrderAccess(order, userId, role) || isMarketTranslator(order, userId, role);
}
function canDownloadOrderFile(order, file, userId, role) {
    if (assertOrderAccess(order, userId, role))
        return true;
    return isMarketTranslator(order, userId, role) && file.kind === FileKind.SOURCE;
}
ordersRouter.post("/estimate", requireAuth, loadActiveUser, async (req, res) => {
    const schema = z.object({
        wordCount: z.number().int().positive().optional(),
        sourceLanguage: z.string().min(2),
        targetLanguage: z.string().min(2),
        translationTypeCode: z.string().optional(),
        urgency: z.nativeEnum(OrderUrgency),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const price = await estimateOrder(parsed.data);
    res.json({ estimatedPrice: price, currency: "RUB" });
});
ordersRouter.get("/mine", requireAuth, loadActiveUser, async (req, res) => {
    const userId = req.authUser.id;
    const role = req.authUser.role;
    const statusRaw = req.query.status;
    const status = typeof statusRaw === "string" ? statusRaw : Array.isArray(statusRaw) ? statusRaw[0] : undefined;
    const where = role === UserRole.CLIENT
        ? { clientId: userId }
        : role === UserRole.TRANSLATOR
            ? { translatorId: userId }
            : {};
    const orders = await prisma.order.findMany({
        where: {
            ...where,
            ...(status ? { status: status } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: {
            client: { select: { id: true, fullName: true, email: true } },
            translator: { select: { id: true, fullName: true, email: true } },
            bids: { include: { translator: { select: { id: true, fullName: true } } } },
            payment: true,
            _count: { select: { files: true, messages: true } },
        },
        take: 100,
    });
    const mapped = orders.map((o) => ({
        ...o,
        agreedPrice: o.agreedPrice != null ? Number(o.agreedPrice) : null,
        estimatedPrice: o.estimatedPrice != null ? Number(o.estimatedPrice) : null,
        bids: o.bids.map((b) => ({ ...b, proposedPrice: Number(b.proposedPrice) })),
        payment: o.payment ? { ...o.payment, amount: Number(o.payment.amount) } : null,
    }));
    res.json({ orders: mapped });
});
/** Открытые заказы для откликов переводчика */
ordersRouter.get("/market", requireAuth, loadActiveUser, async (req, res) => {
    if (req.authUser.role !== UserRole.TRANSLATOR) {
        res.status(403).json({ error: "Доступно переводчикам" });
        return;
    }
    const userId = req.authUser.id;
    const profile = await prisma.translatorProfile.findUnique({
        where: { userId },
        include: { languages: true },
    });
    const codes = profile?.languages.map((l) => l.languageCode) ?? [];
    const open = await prisma.order.findMany({
        where: {
            status: { in: [OrderStatus.SUBMITTED, OrderStatus.PENDING_TRANSLATOR] },
            translatorId: null,
            clientId: { not: userId },
        },
        orderBy: { createdAt: "desc" },
        include: {
            client: { select: { id: true, fullName: true } },
            bids: { where: { translatorId: userId } },
            _count: { select: { bids: true } },
        },
        take: 120,
    });
    const orders = open.filter((o) => codes.length === 0 ||
        (codes.includes(o.sourceLanguage) && codes.includes(o.targetLanguage)));
    res.json({
        orders: orders.map((o) => ({
            ...o,
            agreedPrice: o.agreedPrice != null ? Number(o.agreedPrice) : null,
            estimatedPrice: o.estimatedPrice != null ? Number(o.estimatedPrice) : null,
            myBid: o.bids[0] ?? null,
        })),
    });
});
ordersRouter.get("/:id", requireAuth, loadActiveUser, async (req, res) => {
    const order = await prisma.order.findUnique({
        where: { id: paramId(req.params.id) },
        include: orderDetailInclude,
    });
    if (!order || !canViewOrder(order, req.authUser.id, req.authUser.role)) {
        res.status(404).json({ error: "Заказ не найден" });
        return;
    }
    const full = order;
    res.json({
        order: {
            ...full,
            agreedPrice: full.agreedPrice != null ? Number(full.agreedPrice) : null,
            estimatedPrice: full.estimatedPrice != null ? Number(full.estimatedPrice) : null,
            bids: full.bids.map((b) => ({ ...b, proposedPrice: Number(b.proposedPrice) })),
            payment: full.payment ? { ...full.payment, amount: Number(full.payment.amount) } : null,
        },
    });
});
const createOrderSchema = z.object({
    title: z.string().min(3),
    description: z.string().min(10),
    sourceLanguage: z.string().min(2),
    targetLanguage: z.string().min(2),
    translationTypeCode: z.string().optional(),
    urgency: z.nativeEnum(OrderUrgency),
    wordCount: z.number().int().positive().optional(),
    submit: z.boolean().optional(),
});
ordersRouter.post("/", requireAuth, loadActiveUser, async (req, res) => {
    if (req.authUser.role !== UserRole.CLIENT) {
        res.status(403).json({ error: "Создавать заказы может только заказчик" });
        return;
    }
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const estimatedPrice = await estimateOrder(parsed.data);
    const status = parsed.data.submit ? OrderStatus.SUBMITTED : OrderStatus.DRAFT;
    const order = await prisma.order.create({
        data: {
            clientId: req.authUser.id,
            title: parsed.data.title,
            description: parsed.data.description,
            sourceLanguage: parsed.data.sourceLanguage,
            targetLanguage: parsed.data.targetLanguage,
            translationTypeCode: parsed.data.translationTypeCode,
            urgency: parsed.data.urgency,
            wordCount: parsed.data.wordCount,
            estimatedPrice,
            status,
            submittedAt: parsed.data.submit ? new Date() : null,
        },
    });
    res.status(201).json({ order });
});
ordersRouter.patch("/:id", requireAuth, loadActiveUser, async (req, res) => {
    const order = await prisma.order.findUnique({ where: { id: paramId(req.params.id) } });
    if (!order || order.clientId !== req.authUser.id) {
        res.status(404).json({ error: "Не найдено" });
        return;
    }
    if (order.status !== OrderStatus.DRAFT) {
        res.status(400).json({ error: "Редактировать можно только черновик" });
        return;
    }
    const parsed = createOrderSchema.partial().safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const data = { ...parsed.data };
    delete data.submit;
    if (parsed.data.wordCount !== undefined || parsed.data.urgency || parsed.data.translationTypeCode !== undefined) {
        data.estimatedPrice = await estimateOrder({
            wordCount: (parsed.data.wordCount ?? order.wordCount),
            sourceLanguage: (parsed.data.sourceLanguage ?? order.sourceLanguage),
            targetLanguage: (parsed.data.targetLanguage ?? order.targetLanguage),
            translationTypeCode: parsed.data.translationTypeCode ?? order.translationTypeCode,
            urgency: (parsed.data.urgency ?? order.urgency),
        });
    }
    if (parsed.data.submit) {
        data.status = OrderStatus.SUBMITTED;
        data.submittedAt = new Date();
    }
    const updated = await prisma.order.update({ where: { id: order.id }, data: data });
    res.json({ order: updated });
});
ordersRouter.post("/:id/files", requireAuth, loadActiveUser, upload.single("file"), async (req, res) => {
    const order = await prisma.order.findUnique({ where: { id: paramId(req.params.id) } });
    if (!order || !assertOrderAccess(order, req.authUser.id, req.authUser.role)) {
        res.status(404).json({ error: "Не найдено" });
        return;
    }
    if (!req.file) {
        res.status(400).json({ error: "Файл не получен" });
        return;
    }
    const kind = req.body?.kind || FileKind.SOURCE;
    if (kind === FileKind.DELIVERY && order.translatorId !== req.authUser.id) {
        res.status(403).json({ error: "Готовый перевод может загрузить только исполнитель" });
        return;
    }
    if (kind !== FileKind.DELIVERY && order.clientId !== req.authUser.id && req.authUser.role !== UserRole.ADMIN) {
        res.status(403).json({ error: "Исходники загружает заказчик" });
        return;
    }
    const storageKey = path.join("uploads", req.file.filename).split(path.sep).join("/");
    const file = await prisma.orderFile.create({
        data: {
            orderId: order.id,
            kind,
            fileName: req.file.originalname,
            mimeType: req.file.mimetype,
            sizeBytes: req.file.size,
            storageKey,
        },
    });
    const otherId = order.clientId === req.authUser.id ? order.translatorId : order.clientId;
    if (otherId) {
        await notifyUser(otherId, "FILE", "Новый файл в заказе", order.title, `/orders/${order.id}`);
    }
    res.status(201).json({ file });
});
ordersRouter.get("/:id/files/:fileId/download", requireAuth, loadActiveUser, async (req, res) => {
    const order = await prisma.order.findUnique({ where: { id: paramId(req.params.id) } });
    const file = await prisma.orderFile.findFirst({ where: { id: paramId(req.params.fileId), orderId: paramId(req.params.id) } });
    if (!order || !file || !canDownloadOrderFile(order, file, req.authUser.id, req.authUser.role)) {
        res.status(404).json({ error: "Файл не найден или нет доступа" });
        return;
    }
    const abs = path.join(process.cwd(), file.storageKey);
    res.download(abs, file.fileName);
});
ordersRouter.post("/:id/messages", requireAuth, loadActiveUser, async (req, res) => {
    const schema = z.object({ body: z.string().min(1).max(8000) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "Введите сообщение" });
        return;
    }
    const order = await prisma.order.findUnique({ where: { id: paramId(req.params.id) } });
    if (!order || !canMessageOnOrder(order, req.authUser.id, req.authUser.role)) {
        res.status(404).json({ error: "Нет доступа к переписке по этому заказу" });
        return;
    }
    const msg = await prisma.message.create({
        data: { orderId: order.id, senderId: req.authUser.id, body: parsed.data.body },
    });
    const otherId = order.clientId === req.authUser.id ? order.translatorId : order.clientId;
    if (otherId)
        await notifyUser(otherId, "MESSAGE", "Новое сообщение в заказе", order.title, `/orders/${order.id}`);
    res.status(201).json({ message: msg });
});
ordersRouter.post("/:id/bids", requireAuth, loadActiveUser, async (req, res) => {
    if (req.authUser.role !== UserRole.TRANSLATOR) {
        res.status(403).json({ error: "Откликаться могут только переводчики" });
        return;
    }
    const schema = z.object({
        proposedPrice: z.number().positive(),
        proposedDeadlineAt: z.string().datetime(),
        comment: z.string().max(2000).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const order = await prisma.order.findUnique({ where: { id: paramId(req.params.id) } });
    if (!order || (order.status !== "SUBMITTED" && order.status !== "PENDING_TRANSLATOR")) {
        res.status(400).json({ error: "На этот заказ нельзя откликнуться" });
        return;
    }
    if (order.clientId === req.authUser.id) {
        res.status(400).json({ error: "Нельзя откликаться на свой заказ" });
        return;
    }
    const profile = await prisma.translatorProfile.findUnique({ where: { userId: req.authUser.id } });
    if (!profile?.isVerified) {
        res.status(403).json({ error: "Доступно только верифицированным переводчикам" });
        return;
    }
    const existing = await prisma.orderBid.findFirst({
        where: { orderId: order.id, translatorId: req.authUser.id, status: BidStatus.PENDING },
    });
    if (existing) {
        res.status(409).json({ error: "У вас уже есть активный отклик" });
        return;
    }
    const bid = await prisma.orderBid.create({
        data: {
            orderId: order.id,
            translatorId: req.authUser.id,
            proposedPrice: parsed.data.proposedPrice,
            proposedDeadlineAt: new Date(parsed.data.proposedDeadlineAt),
            comment: parsed.data.comment,
        },
    });
    await notifyUser(order.clientId, "BID", "Новый отклик на заказ", order.title, `/orders/${order.id}`);
    res.status(201).json({ bid });
});
ordersRouter.post("/:id/bids/:bidId/accept", requireAuth, loadActiveUser, async (req, res) => {
    const order = await prisma.order.findUnique({ where: { id: paramId(req.params.id) } });
    if (!order || order.clientId !== req.authUser.id) {
        res.status(404).json({ error: "Не найдено" });
        return;
    }
    if (order.translatorId) {
        res.status(400).json({ error: "Исполнитель уже выбран" });
        return;
    }
    const bid = await prisma.orderBid.findFirst({
        where: { id: paramId(req.params.bidId), orderId: order.id, status: BidStatus.PENDING },
    });
    if (!bid) {
        res.status(404).json({ error: "Отклик не найден" });
        return;
    }
    await prisma.$transaction([
        prisma.orderBid.updateMany({
            where: { orderId: order.id, id: { not: bid.id }, status: BidStatus.PENDING },
            data: { status: BidStatus.REJECTED },
        }),
        prisma.orderBid.update({ where: { id: bid.id }, data: { status: BidStatus.ACCEPTED } }),
        prisma.order.update({
            where: { id: order.id },
            data: {
                translatorId: bid.translatorId,
                agreedPrice: bid.proposedPrice,
                deadlineAt: bid.proposedDeadlineAt,
                status: OrderStatus.ACCEPTED,
                acceptedAt: new Date(),
            },
        }),
    ]);
    await notifyUser(bid.translatorId, "ORDER", "Вас выбрали исполнителем", order.title, `/orders/${order.id}`);
    res.json({ ok: true });
});
ordersRouter.post("/:id/pay-escrow", requireAuth, loadActiveUser, async (req, res) => {
    const order = await prisma.order.findUnique({ where: { id: paramId(req.params.id) }, include: { payment: true } });
    if (!order || order.clientId !== req.authUser.id) {
        res.status(404).json({ error: "Не найдено" });
        return;
    }
    if (order.status !== OrderStatus.ACCEPTED || !order.agreedPrice || !order.translatorId) {
        res.status(400).json({ error: "Оплата доступна после выбора исполнителя" });
        return;
    }
    if (order.payment) {
        res.status(400).json({ error: "Платёж уже создан" });
        return;
    }
    await prisma.$transaction([
        prisma.payment.create({
            data: {
                orderId: order.id,
                amount: order.agreedPrice,
                status: PaymentStatus.HELD,
                heldAt: new Date(),
            },
        }),
        prisma.order.update({ where: { id: order.id }, data: { status: OrderStatus.IN_PROGRESS } }),
    ]);
    if (order.translatorId) {
        await notifyUser(order.translatorId, "PAYMENT", "Средства внесены в эскроу", order.title, `/orders/${order.id}`);
    }
    res.json({ ok: true });
});
ordersRouter.post("/:id/deliver", requireAuth, loadActiveUser, async (req, res) => {
    const order = await prisma.order.findUnique({ where: { id: paramId(req.params.id) } });
    if (!order || order.translatorId !== req.authUser.id) {
        res.status(404).json({ error: "Не найдено" });
        return;
    }
    if (order.status !== OrderStatus.IN_PROGRESS) {
        res.status(400).json({ error: "Неверный статус заказа" });
        return;
    }
    const hasDelivery = await prisma.orderFile.findFirst({
        where: { orderId: order.id, kind: FileKind.DELIVERY },
    });
    if (!hasDelivery) {
        res.status(400).json({ error: "Загрузите файл с готовым переводом (тип «Готовый файл»)" });
        return;
    }
    await prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.DELIVERED, deliveredAt: new Date() },
    });
    await notifyUser(order.clientId, "ORDER", "Перевод сдан на проверку", order.title, `/orders/${order.id}`);
    res.json({ ok: true });
});
ordersRouter.post("/:id/complete", requireAuth, loadActiveUser, async (req, res) => {
    const order = await prisma.order.findUnique({ where: { id: paramId(req.params.id) }, include: { payment: true } });
    if (!order || order.clientId !== req.authUser.id) {
        res.status(404).json({ error: "Не найдено" });
        return;
    }
    if (order.status !== OrderStatus.DELIVERED) {
        res.status(400).json({ error: "Сначала дождитесь сдачи работы" });
        return;
    }
    await prisma.$transaction(async (tx) => {
        if (order.payment && order.payment.status === PaymentStatus.HELD) {
            await tx.payment.update({
                where: { orderId: order.id },
                data: { status: PaymentStatus.RELEASED, releasedAt: new Date() },
            });
        }
        await tx.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.COMPLETED, completedAt: new Date() },
        });
    });
    if (order.translatorId) {
        await notifyUser(order.translatorId, "ORDER", "Заказ принят, средства разблокированы", order.title, `/orders/${order.id}`);
    }
    res.json({ ok: true });
});
ordersRouter.post("/:id/review", requireAuth, loadActiveUser, async (req, res) => {
    const schema = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().max(2000).optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const order = await prisma.order.findUnique({ where: { id: paramId(req.params.id) } });
    if (!order || order.clientId !== req.authUser.id || order.status !== OrderStatus.COMPLETED) {
        res.status(400).json({ error: "Отзыв доступен после завершения заказа" });
        return;
    }
    const existing = await prisma.review.findUnique({ where: { orderId: order.id } });
    if (existing) {
        res.status(409).json({ error: "Отзыв уже оставлен" });
        return;
    }
    const review = await prisma.review.create({
        data: {
            orderId: order.id,
            authorId: req.authUser.id,
            rating: parsed.data.rating,
            comment: parsed.data.comment,
        },
    });
    res.status(201).json({ review });
});
ordersRouter.post("/:id/complaints", requireAuth, loadActiveUser, async (req, res) => {
    const schema = z.object({ body: z.string().min(10).max(4000) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "Опишите суть жалобы" });
        return;
    }
    const order = await prisma.order.findUnique({ where: { id: paramId(req.params.id) } });
    if (!order || !assertOrderAccess(order, req.authUser.id, req.authUser.role)) {
        res.status(404).json({ error: "Не найдено" });
        return;
    }
    const c = await prisma.complaint.create({
        data: { orderId: order.id, authorId: req.authUser.id, body: parsed.data.body },
    });
    const admins = await prisma.user.findMany({ where: { role: UserRole.ADMIN, isActive: true } });
    for (const a of admins) {
        await notifyUser(a.id, "COMPLAINT", "Новая жалоба по заказу", order.title, `/cabinet/admin`);
    }
    res.status(201).json({ complaint: c });
});
ordersRouter.post("/:id/cancel", requireAuth, loadActiveUser, async (req, res) => {
    const order = await prisma.order.findUnique({ where: { id: paramId(req.params.id) }, include: { payment: true } });
    if (!order || order.clientId !== req.authUser.id) {
        res.status(404).json({ error: "Не найдено" });
        return;
    }
    if (!["DRAFT", "SUBMITTED", "PENDING_TRANSLATOR", "ACCEPTED"].includes(order.status)) {
        res.status(400).json({ error: "Нельзя отменить на этом этапе" });
        return;
    }
    await prisma.$transaction(async (tx) => {
        if (order.payment?.status === PaymentStatus.HELD) {
            await tx.payment.update({ where: { orderId: order.id }, data: { status: PaymentStatus.REFUNDED } });
        }
        await tx.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.CANCELLED, cancelledAt: new Date(), translatorId: null },
        });
        await tx.orderBid.updateMany({ where: { orderId: order.id }, data: { status: BidStatus.REJECTED } });
    });
    res.json({ ok: true });
});
