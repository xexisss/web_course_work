import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { prisma } from "../prisma.js";
import { signToken } from "../utils/jwt.js";
import { requireAuth } from "../middleware/auth.js";
export const authRouter = Router();
const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    fullName: z.string().min(2),
    phone: z.string().optional(),
    role: z.nativeEnum(UserRole).refine((r) => r === UserRole.CLIENT || r === UserRole.TRANSLATOR, {
        message: "Можно зарегистрироваться как заказчик или переводчик",
    }),
});
authRouter.post("/register", async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const { email, password, fullName, phone, role } = parsed.data;
    const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (exists) {
        res.status(409).json({ error: "Пользователь с таким email уже существует" });
        return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
        data: {
            email: email.toLowerCase(),
            passwordHash,
            fullName,
            phone,
            role,
            translatorProfile: role === UserRole.TRANSLATOR
                ? {
                    create: {
                        headline: "",
                        bio: "",
                        ratePer1000: 1000,
                        currency: "RUB",
                        languages: { create: [{ languageCode: "ru", proficiency: "native", isNative: true }] },
                    },
                }
                : undefined,
        },
    });
    const token = signToken({ sub: user.id, role: user.role, email: user.email });
    res.status(201).json({
        token,
        user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, phone: user.phone },
    });
});
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});
authRouter.post("/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "Неверные данные" });
        return;
    }
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
        res.status(401).json({ error: "Неверный email или пароль" });
        return;
    }
    if (!user.isActive) {
        res.status(403).json({ error: "Учётная запись заблокирована" });
        return;
    }
    const token = signToken({ sub: user.id, role: user.role, email: user.email });
    res.json({
        token,
        user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, phone: user.phone },
    });
});
authRouter.get("/me", requireAuth, async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.authUser.id },
        include: { translatorProfile: { include: { languages: true, specialties: true, portfolioItems: true } } },
    });
    if (!user) {
        res.status(404).json({ error: "Не найдено" });
        return;
    }
    res.json({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        locale: user.locale,
        translatorProfile: user.translatorProfile,
    });
});
