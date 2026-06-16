import { Router } from "express";
import { prisma } from "../prisma.js";

export const catalogRouter = Router();

catalogRouter.get("/options", async (_req, res) => {
  const [types, pairs] = await Promise.all([
    prisma.dictionaryTranslationType.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.dictionaryLanguagePair.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  res.json({ translationTypes: types, languagePairs: pairs });
});

catalogRouter.get("/translators", async (req, res) => {
  const source = typeof req.query.source === "string" ? req.query.source : undefined;
  const target = typeof req.query.target === "string" ? req.query.target : undefined;
  const specialty = typeof req.query.specialty === "string" ? req.query.specialty : undefined;
  const minRating = req.query.minRating ? Number(req.query.minRating) : undefined;
  const maxRate = req.query.maxRate ? Number(req.query.maxRate) : undefined;

  const profiles = await prisma.translatorProfile.findMany({
    where: {
      isAvailable: true,
      isVerified: true,
      user: { isActive: true },
      ...(specialty
        ? { specialties: { some: { code: specialty } } }
        : {}),
      ...(source && target
        ? {
            AND: [
              { languages: { some: { languageCode: source } } },
              { languages: { some: { languageCode: target } } },
            ],
          }
        : source
          ? { languages: { some: { languageCode: source } } }
          : target
            ? { languages: { some: { languageCode: target } } }
            : {}),
      ...(maxRate !== undefined && !Number.isNaN(maxRate) ? { ratePer1000: { lte: maxRate } } : {}),
    },
    include: {
      user: { select: { id: true, fullName: true, email: true, createdAt: true } },
      languages: true,
      specialties: true,
      portfolioItems: { take: 3 },
    },
  });

  const withRatings = await Promise.all(
    profiles.map(async (p) => {
      const agg = await prisma.review.aggregate({
        where: { order: { translatorId: p.userId, status: "COMPLETED" } },
        _avg: { rating: true },
        _count: { rating: true },
      });
      const avg = agg._avg.rating ? Number(agg._avg.rating) : null;
      const count = agg._count.rating;
      return {
        ...p,
        ratingAvg: avg,
        ratingCount: count,
        ratePer1000: Number(p.ratePer1000),
      };
    }),
  );

  const filtered =
    minRating !== undefined && !Number.isNaN(minRating)
      ? withRatings.filter((x) => (x.ratingAvg ?? 0) >= minRating)
      : withRatings;

  res.json({ translators: filtered });
});

catalogRouter.get("/reviews", async (_req, res) => {
  const rows = await prisma.review.findMany({
    take: 60,
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, fullName: true } },
      order: {
        select: {
          title: true,
          translator: { select: { id: true, fullName: true } },
        },
      },
    },
  });
  res.json({
    reviews: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      authorName: r.author.fullName,
      orderTitle: r.order.title,
      translatorId: r.order.translator?.id ?? null,
      translatorName: r.order.translator?.fullName ?? null,
    })),
  });
});
