import type { OrderUrgency } from "@prisma/client";
import { prisma } from "../prisma.js";

const PLATFORM_BASE_PER_1000 = 450;

export async function estimateOrder(input: {
  wordCount?: number | null;
  sourceLanguage: string;
  targetLanguage: string;
  translationTypeCode?: string | null;
  urgency: OrderUrgency;
}): Promise<number> {
  const words = Math.max(input.wordCount ?? 800, 100);
  let typeMult = 1;
  let pairMult = 1;
  if (input.translationTypeCode) {
    const t = await prisma.dictionaryTranslationType.findUnique({
      where: { code: input.translationTypeCode },
    });
    if (t?.isActive) typeMult = Number(t.priceMultiplier);
  }
  const pair = await prisma.dictionaryLanguagePair.findFirst({
    where: { sourceLanguage: input.sourceLanguage, targetLanguage: input.targetLanguage, isActive: true },
  });
  if (pair) pairMult = Number(pair.rarityMultiplier);
  const urgencyMult = input.urgency === "EXPRESS" ? 1.35 : 1;
  const raw = (words / 1000) * PLATFORM_BASE_PER_1000 * typeMult * pairMult * urgencyMult;
  return Math.round(raw * 100) / 100;
}
