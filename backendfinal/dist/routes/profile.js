import { Router } from "express";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { prisma } from "../prisma.js";
import { requireAuth, loadActiveUser } from "../middleware/auth.js";
export const profileRouter = Router();
profileRouter.patch("/translator/me", requireAuth, loadActiveUser, async (req, res) => {
    if (req.authUser.role !== UserRole.TRANSLATOR) {
        res.status(403).json({ error: "Доступно переводчикам" });
        return;
    }
    const schema = z.object({
        headline: z.string().max(200).optional(),
        bio: z.string().max(8000).optional(),
        yearsExperience: z.number().int().min(0).max(80).optional(),
        ratePer1000: z.number().positive().max(1_000_000).optional(),
        currency: z.string().length(3).optional(),
        isAvailable: z.boolean().optional(),
        languages: z
            .array(z.object({ languageCode: z.string(), proficiency: z.string(), isNative: z.boolean().optional() }))
            .optional(),
        specialties: z.array(z.object({ code: z.string() })).optional(),
        portfolioItems: z
            .array(z.object({
            title: z.string(),
            description: z.string().optional(),
            sampleUrl: z.string().max(500).optional(),
        }))
            .optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const { languages, specialties, portfolioItems, ...rest } = parsed.data;
    const profile = await prisma.translatorProfile.update({
        where: { userId: req.authUser.id },
        data: {
            ...rest,
            ...(languages
                ? {
                    languages: { deleteMany: {}, create: languages.map((l) => ({ ...l, isNative: l.isNative ?? false })) },
                }
                : {}),
            ...(specialties ? { specialties: { deleteMany: {}, create: specialties } } : {}),
            ...(portfolioItems
                ? { portfolioItems: { deleteMany: {}, create: portfolioItems } }
                : {}),
        },
        include: { languages: true, specialties: true, portfolioItems: true },
    });
    res.json({ profile: { ...profile, ratePer1000: Number(profile.ratePer1000) } });
});
profileRouter.get("/translator/:userId", async (req, res) => {
    const profile = await prisma.translatorProfile.findUnique({
        where: { userId: req.params.userId },
        include: {
            user: { select: { id: true, fullName: true, createdAt: true } },
            languages: true,
            specialties: true,
            portfolioItems: true,
        },
    });
    if (!profile || !profile.user) {
        res.status(404).json({ error: "Профиль не найден" });
        return;
    }
    const agg = await prisma.review.aggregate({
        where: { order: { translatorId: profile.userId, status: "COMPLETED" } },
        _avg: { rating: true },
        _count: { rating: true },
    });
    res.json({
        profile: {
            ...profile,
            ratePer1000: Number(profile.ratePer1000),
            user: profile.user,
        },
        stats: {
            ratingAvg: agg._avg.rating != null ? Number(agg._avg.rating) : null,
            ratingCount: agg._count.rating,
        },
    });
});
