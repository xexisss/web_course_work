import { PrismaClient, UserRole, OrderStatus, OrderUrgency, PaymentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seedDictionaries() {
  const types = [
    { code: "general", label: "Общий перевод", priceMultiplier: 1.0, sortOrder: 0 },
    { code: "legal", label: "Юридический", priceMultiplier: 1.25, sortOrder: 1 },
    { code: "medical", label: "Медицинский", priceMultiplier: 1.35, sortOrder: 2 },
    { code: "technical", label: "Технический / IT", priceMultiplier: 1.2, sortOrder: 3 },
    { code: "marketing", label: "Маркетинг и реклама", priceMultiplier: 1.15, sortOrder: 4 },
  ];
  for (const t of types) {
    await prisma.dictionaryTranslationType.upsert({
      where: { code: t.code },
      update: { label: t.label, priceMultiplier: t.priceMultiplier, sortOrder: t.sortOrder },
      create: t,
    });
  }

  const pairs = [
    { sourceLanguage: "en", targetLanguage: "ru", label: "Английский → Русский", rarityMultiplier: 1.0, sortOrder: 0 },
    { sourceLanguage: "ru", targetLanguage: "en", label: "Русский → Английский", rarityMultiplier: 1.0, sortOrder: 1 },
    { sourceLanguage: "de", targetLanguage: "ru", label: "Немецкий → Русский", rarityMultiplier: 1.15, sortOrder: 2 },
    { sourceLanguage: "zh", targetLanguage: "ru", label: "Китайский → Русский", rarityMultiplier: 1.35, sortOrder: 3 },
  ];
  for (const p of pairs) {
    await prisma.dictionaryLanguagePair.upsert({
      where: { sourceLanguage_targetLanguage: { sourceLanguage: p.sourceLanguage, targetLanguage: p.targetLanguage } },
      update: { label: p.label, rarityMultiplier: p.rarityMultiplier, sortOrder: p.sortOrder },
      create: p,
    });
  }
}

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);
  await seedDictionaries();

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.local" },
    update: { passwordHash, isActive: true, role: UserRole.ADMIN },
    create: {
      email: "admin@example.local",
      passwordHash,
      role: UserRole.ADMIN,
      fullName: "Администратор Платформы",
      phone: "+79000000000",
    },
  });

  const client = await prisma.user.upsert({
    where: { email: "client@example.local" },
    update: { passwordHash },
    create: {
      email: "client@example.local",
      passwordHash,
      role: UserRole.CLIENT,
      fullName: "Иван Клиентов",
      phone: "+79000000001",
    },
  });

  const translatorUser = await prisma.user.upsert({
    where: { email: "translator@example.local" },
    update: { passwordHash },
    create: {
      email: "translator@example.local",
      passwordHash,
      role: UserRole.TRANSLATOR,
      fullName: "Мария Переводчикова",
      phone: "+79000000002",
    },
  });

  await prisma.translatorProfile.upsert({
    where: { userId: translatorUser.id },
    update: { isVerified: true },
    create: {
      userId: translatorUser.id,
      headline: "EN↔RU, юридический и IT",
      bio: "Опыт локализации ПО и договоров. Сертификат TOEFL iBT.",
      yearsExperience: 7,
      ratePer1000: 1200,
      currency: "RUB",
      isVerified: true,
      languages: {
        create: [
          { languageCode: "ru", proficiency: "native", isNative: true },
          { languageCode: "en", proficiency: "C2", isNative: false },
        ],
      },
      specialties: {
        create: [{ code: "legal" }, { code: "it" }],
      },
      portfolioItems: {
        create: [{ title: "Локализация мобильного приложения", description: "EN→RU, 12 тыс. слов" }],
      },
    },
  });

  const demoOrderTitle = "Перевод пользовательского соглашения";
  const existingDemoOrder = await prisma.order.findFirst({
    where: { title: demoOrderTitle, clientId: client.id },
  });
  if (!existingDemoOrder) {
    await prisma.order.create({
      data: {
        clientId: client.id,
        translatorId: translatorUser.id,
        title: demoOrderTitle,
        description: "Объём ~3 страницы, срок 5 дней.",
        sourceLanguage: "en",
        targetLanguage: "ru",
        translationTypeCode: "legal",
        urgency: OrderUrgency.STANDARD,
        status: OrderStatus.IN_PROGRESS,
        wordCount: 1800,
        estimatedPrice: 2500,
        agreedPrice: 2500,
        currency: "RUB",
        deadlineAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        submittedAt: new Date(),
        acceptedAt: new Date(),
        payment: {
          create: {
            amount: 2500,
            status: PaymentStatus.HELD,
            heldAt: new Date(),
          },
        },
      },
    });
  }

  console.log("Seed OK:", { admin: admin.email, client: client.email, translator: translatorUser.email });
  console.log("Демо-пароль для всех учёток: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
