import { Router } from "express";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { prisma } from "../prisma.js";
import { requireAuth, requireRole, loadActiveUser } from "../middleware/auth.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, loadActiveUser, requireRole(UserRole.ADMIN));

adminRouter.get("/stats", async (_req, res) => {
  const [users, orders, complaints, pendingVerify] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], _count: true }),
    prisma.order.groupBy({ by: ["status"], _count: true }),
    prisma.complaint.groupBy({ by: ["status"], _count: true }),
    prisma.translatorProfile.count({ where: { isVerified: false, user: { isActive: true } } }),
  ]);
  res.json({ users, orders, complaints, pendingVerify });
});

adminRouter.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      createdAt: true,
      translatorProfile: { select: { isVerified: true } },
    },
  });
  res.json({ users });
});

adminRouter.patch("/users/:id", async (req, res) => {
  const schema = z.object({ isActive: z.boolean().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const user = await prisma.user.update({ where: { id: req.params.id }, data: parsed.data });
  res.json({ user });
});

adminRouter.patch("/translators/:userId/verify", async (req, res) => {
  const schema = z.object({ isVerified: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const profile = await prisma.translatorProfile.update({
    where: { userId: req.params.userId },
    data: { isVerified: parsed.data.isVerified },
  });
  const u = await prisma.user.findUnique({ where: { id: req.params.userId } });
  if (u) {
    await prisma.notification.create({
      data: {
        userId: u.id,
        type: "VERIFY",
        title: parsed.data.isVerified ? "Профиль верифицирован" : "Верификация снята",
        link: "/cabinet/translator",
      },
    });
  }
  res.json({ profile });
});

adminRouter.get("/complaints", async (_req, res) => {
  const list = await prisma.complaint.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      order: { select: { id: true, title: true, status: true } },
      author: { select: { id: true, fullName: true, email: true } },
    },
  });
  res.json({ complaints: list });
});

adminRouter.patch("/complaints/:id", async (req, res) => {
  const schema = z.object({
    status: z.enum(["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"]),
    adminNotes: z.string().max(4000).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const c = await prisma.complaint.update({
    where: { id: req.params.id },
    data: {
      status: parsed.data.status,
      adminNotes: parsed.data.adminNotes,
      resolvedAt: ["RESOLVED", "DISMISSED"].includes(parsed.data.status) ? new Date() : null,
    },
  });
  res.json({ complaint: c });
});

adminRouter.get("/dictionaries/types", async (_req, res) => {
  const items = await prisma.dictionaryTranslationType.findMany({ orderBy: { sortOrder: "asc" } });
  res.json({ items });
});

adminRouter.post("/dictionaries/types", async (req, res) => {
  const schema = z.object({
    code: z.string().min(2),
    label: z.string().min(2),
    priceMultiplier: z.number().positive().max(10).optional(),
    sortOrder: z.number().int().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const row = await prisma.dictionaryTranslationType.create({
    data: {
      code: parsed.data.code,
      label: parsed.data.label,
      priceMultiplier: parsed.data.priceMultiplier ?? 1,
      sortOrder: parsed.data.sortOrder ?? 0,
    },
  });
  res.status(201).json({ item: row });
});

adminRouter.patch("/dictionaries/types/:id", async (req, res) => {
  const schema = z.object({
    label: z.string().optional(),
    priceMultiplier: z.number().positive().max(10).optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const row = await prisma.dictionaryTranslationType.update({ where: { id: req.params.id }, data: parsed.data });
  res.json({ item: row });
});

adminRouter.get("/dictionaries/pairs", async (_req, res) => {
  const items = await prisma.dictionaryLanguagePair.findMany({ orderBy: { sortOrder: "asc" } });
  res.json({ items });
});

adminRouter.post("/dictionaries/pairs", async (req, res) => {
  const schema = z.object({
    sourceLanguage: z.string().min(2),
    targetLanguage: z.string().min(2),
    label: z.string().optional(),
    rarityMultiplier: z.number().positive().max(10).optional(),
    sortOrder: z.number().int().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const row = await prisma.dictionaryLanguagePair.create({
    data: {
      sourceLanguage: parsed.data.sourceLanguage,
      targetLanguage: parsed.data.targetLanguage,
      label: parsed.data.label,
      rarityMultiplier: parsed.data.rarityMultiplier ?? 1,
      sortOrder: parsed.data.sortOrder ?? 0,
    },
  });
  res.status(201).json({ item: row });
});

adminRouter.patch("/dictionaries/pairs/:id", async (req, res) => {
  const schema = z.object({
    label: z.string().optional(),
    rarityMultiplier: z.number().positive().max(10).optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const row = await prisma.dictionaryLanguagePair.update({ where: { id: req.params.id }, data: parsed.data });
  res.json({ item: row });
});

adminRouter.get("/orders", async (_req, res) => {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      client: { select: { fullName: true, email: true } },
      translator: { select: { fullName: true, email: true } },
    },
  });
  res.json({ orders });
});
