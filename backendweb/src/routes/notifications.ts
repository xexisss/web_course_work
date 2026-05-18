import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth, loadActiveUser } from "../middleware/auth.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", requireAuth, loadActiveUser, async (req, res) => {
  const items = await prisma.notification.findMany({
    where: { userId: req.authUser!.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json({ notifications: items });
});

notificationsRouter.post("/:id/read", requireAuth, loadActiveUser, async (req, res) => {
  const n = await prisma.notification.findFirst({
    where: { id: String(req.params.id), userId: req.authUser!.id },
  });
  if (!n) {
    res.status(404).json({ error: "Не найдено" });
    return;
  }
  await prisma.notification.update({ where: { id: n.id }, data: { readAt: new Date() } });
  res.json({ ok: true });
});

notificationsRouter.post("/read-all", requireAuth, loadActiveUser, async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.authUser!.id, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ ok: true });
});
