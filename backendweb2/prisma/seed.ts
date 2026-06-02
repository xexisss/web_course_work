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
    { sourceLanguage: "pl", targetLanguage: "ru", label: "Польский → Русский", rarityMultiplier: 1.1, sortOrder: 4 },
    { sourceLanguage: "fr", targetLanguage: "ru", label: "Французский → Русский", rarityMultiplier: 1.12, sortOrder: 5 },
  ];
  for (const p of pairs) {
    await prisma.dictionaryLanguagePair.upsert({
      where: { sourceLanguage_targetLanguage: { sourceLanguage: p.sourceLanguage, targetLanguage: p.targetLanguage } },
      update: { label: p.label, rarityMultiplier: p.rarityMultiplier, sortOrder: p.sortOrder },
      create: p,
    });
  }
}

type TranslatorSeed = {
  email: string;
  fullName: string;
  phone: string;
  headline: string;
  bio: string;
  yearsExperience: number;
  ratePer1000: number;
  languages: { languageCode: string; proficiency: string; isNative?: boolean }[];
  specialties: string[];
  portfolio: { title: string; description: string }[];
};

function ensurePortfolio(fullName: string, existing: { title: string; description: string }[], specialties: string[]) {
  const base = [...existing];
  const has = new Set(base.map((p) => p.title.trim().toLowerCase()));

  const add = (title: string, description: string) => {
    const k = title.trim().toLowerCase();
    if (has.has(k)) return;
    base.push({ title, description });
    has.add(k);
  };

  if (specialties.includes("legal")) {
    add("Договор / NDA", "Юридический перевод, единообразие терминов, аккуратное форматирование.");
    add("Пакет для визы", "Справки и заявления, проверка дат/ФИО, подготовка к нотариальному заверению.");
  }
  if (specialties.includes("medical")) {
    add("Инструкция к препарату", "Медицинская терминология, таблицы, единицы измерения, соответствие оригиналу.");
    add("Протокол исследования", "Клинические протоколы и отчёты, строгий стиль, контроль сокращений.");
  }
  if (specialties.includes("technical")) {
    add("Техническое руководство", "Документация, интерфейсы, API, сохранение структуры и стиля.");
    add("Локализация UI", "Короткие строки, ограничения по длине, естественный русский язык.");
  }
  if (specialties.includes("marketing")) {
    add("Презентация / лендинг", "Маркетинговый тон, слоганы, адаптация под аудиторию.");
    add("Карточки товаров", "E-commerce, SEO-формулировки, единый стиль описаний.");
  }
  add("Корректура и вычитка", "Проверка пунктуации, терминов, единообразия и оформления.");

  // гарантируем ровно 4 пункта (под 4 картинки)
  while (base.length < 4) {
    add(`Проект #${base.length + 1}`, "Пример работы в портфолио (демо-описание для учебного проекта).");
  }
  return base.slice(0, 4);
}

async function upsertTranslator(input: TranslatorSeed) {
  const passwordHash = await bcrypt.hash("password123", 10);
  const portfolio = ensurePortfolio(input.fullName, input.portfolio ?? [], input.specialties ?? []);
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: { passwordHash, fullName: input.fullName, phone: input.phone },
    create: {
      email: input.email,
      passwordHash,
      role: UserRole.TRANSLATOR,
      fullName: input.fullName,
      phone: input.phone,
    },
  });

  const profile = await prisma.translatorProfile.upsert({
    where: { userId: user.id },
    update: {
      headline: input.headline,
      bio: input.bio,
      yearsExperience: input.yearsExperience,
      ratePer1000: input.ratePer1000,
      currency: "BYN",
      isVerified: true,
      isAvailable: true,
    },
    create: {
      userId: user.id,
      headline: input.headline,
      bio: input.bio,
      yearsExperience: input.yearsExperience,
      ratePer1000: input.ratePer1000,
      currency: "BYN",
      isVerified: true,
      languages: {
        create: input.languages.map((l) => ({
          languageCode: l.languageCode,
          proficiency: l.proficiency,
          isNative: l.isNative ?? false,
        })),
      },
      specialties: { create: input.specialties.map((code) => ({ code })) },
      portfolioItems: { create: portfolio },
    },
  });

  await prisma.translatorLanguage.deleteMany({ where: { translatorProfileId: profile.id } });
  await prisma.translatorSpecialty.deleteMany({ where: { translatorProfileId: profile.id } });
  await prisma.translatorPortfolioItem.deleteMany({ where: { translatorProfileId: profile.id } });

  await prisma.translatorLanguage.createMany({
    data: input.languages.map((l) => ({
      translatorProfileId: profile.id,
      languageCode: l.languageCode,
      proficiency: l.proficiency,
      isNative: l.isNative ?? false,
    })),
  });
  await prisma.translatorSpecialty.createMany({
    data: input.specialties.map((code) => ({ translatorProfileId: profile.id, code })),
  });
  await prisma.translatorPortfolioItem.createMany({
    data: portfolio.map((p) => ({
      translatorProfileId: profile.id,
      title: p.title,
      description: p.description,
    })),
  });

  return user;
}

const TRANSLATORS: TranslatorSeed[] = [
  {
    email: "translator@example.local",
    fullName: "Мария Переводчикова",
    phone: "+375292222222",
    headline: "EN↔RU, юридический и IT",
    bio: "Опыт локализации ПО и договоров для белорусских и международных компаний. Сертификат TOEFL iBT.",
    yearsExperience: 7,
    ratePer1000: 52,
    languages: [
      { languageCode: "ru", proficiency: "native", isNative: true },
      { languageCode: "en", proficiency: "C2" },
    ],
    specialties: ["legal", "technical"],
    portfolio: [
      { title: "Локализация мобильного приложения", description: "EN→RU, 12 тыс. слов, финтех" },
      { title: "Договор поставки", description: "Юридический перевод для Минской торговой компании" },
    ],
  },
  {
    email: "alex@example.local",
    fullName: "Алексей Немецов",
    phone: "+375293333333",
    headline: "DE→RU, техническая документация",
    bio: "Инженер-переводчик, 9 лет в машиностроении и ERP-системах.",
    yearsExperience: 9,
    ratePer1000: 48,
    languages: [
      { languageCode: "ru", proficiency: "native", isNative: true },
      { languageCode: "de", proficiency: "C1" },
    ],
    specialties: ["technical", "general"],
    portfolio: [{ title: "Руководство по эксплуатации станка", description: "DE→RU, 280 страниц" }],
  },
  {
    email: "elena@example.local",
    fullName: "Елена Медиченко",
    phone: "+375294444444",
    headline: "ZH→RU, медицина и фарма",
    bio: "Клинический перевод, инструкции к препаратам, сотрудничество с лабораториями РБ.",
    yearsExperience: 5,
    ratePer1000: 58,
    languages: [
      { languageCode: "ru", proficiency: "native", isNative: true },
      { languageCode: "zh", proficiency: "HSK6" },
    ],
    specialties: ["medical", "general"],
    portfolio: [{ title: "Инструкция к медоборудованию", description: "ZH→RU, сертификация ЕАЭС" }],
  },
  {
    email: "olga@example.local",
    fullName: "Ольга Французова",
    phone: "+375295555555",
    headline: "FR→RU, маркетинг и PR",
    bio: "Перевод рекламных кампаний и пресс-релизов для FMCG-брендов в Беларуси.",
    yearsExperience: 6,
    ratePer1000: 46,
    languages: [
      { languageCode: "ru", proficiency: "native", isNative: true },
      { languageCode: "fr", proficiency: "C1" },
    ],
    specialties: ["marketing", "general"],
    portfolio: [{ title: "Кампания для ритейла", description: "FR→RU, слоганы и баннеры" }],
  },
  {
    email: "dmitry@example.local",
    fullName: "Дмитрий Польский",
    phone: "+375296666666",
    headline: "PL→RU, юридические тексты",
    bio: "Специализация на договорах и таможенной документации в торговле с Польшей.",
    yearsExperience: 8,
    ratePer1000: 50,
    languages: [
      { languageCode: "ru", proficiency: "native", isNative: true },
      { languageCode: "pl", proficiency: "C1" },
    ],
    specialties: ["legal", "general"],
    portfolio: [{ title: "Таможенная декларация", description: "PL→RU, полный пакет документов" }],
  },
  {
    email: "natalia@example.local",
    fullName: "Наталья Клиник",
    phone: "+375297777777",
    headline: "EN→RU, медицина",
    bio: "Врач-переводчик, клинические исследования и протоколы для фармкомпаний.",
    yearsExperience: 10,
    ratePer1000: 62,
    languages: [
      { languageCode: "ru", proficiency: "native", isNative: true },
      { languageCode: "en", proficiency: "C1" },
    ],
    specialties: ["medical", "legal"],
    portfolio: [{ title: "Протокол клинического исследования", description: "EN→RU, 120 стр." }],
  },
  {
    email: "sergey@example.local",
    fullName: "Сергей Кодов",
    phone: "+375298888888",
    headline: "EN→RU, IT и геймдев",
    bio: "Локализация игр, SaaS и документации API. Работа с CAT-инструментами.",
    yearsExperience: 4,
    ratePer1000: 44,
    languages: [
      { languageCode: "ru", proficiency: "native", isNative: true },
      { languageCode: "en", proficiency: "C2" },
    ],
    specialties: ["technical", "marketing"],
    portfolio: [{ title: "Локализация indie-игры", description: "EN→RU, 18 тыс. строк UI" }],
  },
  {
    email: "irina@example.local",
    fullName: "Ирина Смирнова",
    phone: "+375299999999",
    headline: "EN↔RU, общая тематика",
    bio: "Художественный и публицистический перевод, корректура готовых текстов.",
    yearsExperience: 12,
    ratePer1000: 55,
    languages: [
      { languageCode: "ru", proficiency: "native", isNative: true },
      { languageCode: "en", proficiency: "C2" },
    ],
    specialties: ["general", "marketing"],
    portfolio: [{ title: "Сборник статей", description: "EN→RU, научпоп, 45 тыс. слов" }],
  },
  {
    email: "victor@example.local",
    fullName: "Виктор Шнайдер",
    phone: "+375291010101",
    headline: "DE→RU, инженерия",
    bio: "Перевод чертежей, спецификаций и стандартов DIN для промышленных предприятий.",
    yearsExperience: 11,
    ratePer1000: 54,
    languages: [
      { languageCode: "ru", proficiency: "native", isNative: true },
      { languageCode: "de", proficiency: "C2" },
    ],
    specialties: ["technical", "legal"],
    portfolio: [{ title: "Техпаспорт оборудования", description: "DE→RU, 90 стр." }],
  },
  {
    email: "anna@example.local",
    fullName: "Анна Лендова",
    phone: "+375291111112",
    headline: "EN→RU, e-commerce",
    bio: "Карточки товаров, email-рассылки и SEO-тексты для маркетплейсов.",
    yearsExperience: 5,
    ratePer1000: 43,
    languages: [
      { languageCode: "ru", proficiency: "native", isNative: true },
      { languageCode: "en", proficiency: "C1" },
    ],
    specialties: ["marketing", "general"],
    portfolio: [{ title: "Каталог электроники", description: "EN→RU, 2000 SKU" }],
  },
  {
    email: "pavel@example.local",
    fullName: "Павел Испанский",
    phone: "+375291212121",
    headline: "ES→RU, туризм и HoReCa",
    bio: "Меню ресторанов, экскурсии, маркетинг отелей на побережье.",
    yearsExperience: 6,
    ratePer1000: 47,
    languages: [
      { languageCode: "ru", proficiency: "native", isNative: true },
      { languageCode: "es", proficiency: "C1" },
    ],
    specialties: ["marketing", "general"],
    portfolio: [{ title: "Гид по Минску", description: "ES→RU, аудиогид 40 мин." }],
  },
  {
    email: "kate@example.local",
    fullName: "Екатерина Нотариус",
    phone: "+375291313131",
    headline: "EN→RU, нотариальные тексты",
    bio: "Апостиль, доверенности, сертифицированный перевод для посольств.",
    yearsExperience: 9,
    ratePer1000: 60,
    languages: [
      { languageCode: "ru", proficiency: "native", isNative: true },
      { languageCode: "en", proficiency: "C2" },
    ],
    specialties: ["legal", "general"],
    portfolio: [{ title: "Пакет для визы", description: "EN→RU, 25 документов" }],
  },
  {
    email: "roman@example.local",
    fullName: "Роман Техписатель",
    phone: "+375291414141",
    headline: "EN→RU, UX-копирайтинг",
    bio: "Микротексты интерфейсов, онбординг, push-уведомления для fintech.",
    yearsExperience: 3,
    ratePer1000: 41,
    languages: [
      { languageCode: "ru", proficiency: "native", isNative: true },
      { languageCode: "en", proficiency: "C1" },
    ],
    specialties: ["technical", "marketing"],
    portfolio: [{ title: "Банковское приложение", description: "EN→RU, 800 строк UI" }],
  },
];

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
      phone: "+375290000000",
    },
  });

  const client = await prisma.user.upsert({
    where: { email: "client@example.local" },
    update: { passwordHash, phone: "+375291111111" },
    create: {
      email: "client@example.local",
      passwordHash,
      role: UserRole.CLIENT,
      fullName: "Иван Клиентов",
      phone: "+375291111111",
    },
  });

  const translators = [];
  for (const t of TRANSLATORS) {
    translators.push(await upsertTranslator(t));
  }
  const maria = translators[0]!;

  const demoOrderTitle = "Перевод пользовательского соглашения";
  let inProgressOrder = await prisma.order.findFirst({
    where: { title: demoOrderTitle, clientId: client.id },
  });
  if (!inProgressOrder) {
    inProgressOrder = await prisma.order.create({
      data: {
        clientId: client.id,
        translatorId: maria.id,
        title: demoOrderTitle,
        description: "Объём ~3 страницы, срок 5 дней. Требуется юридическая терминология РБ.",
        sourceLanguage: "en",
        targetLanguage: "ru",
        translationTypeCode: "legal",
        urgency: OrderUrgency.STANDARD,
        status: OrderStatus.IN_PROGRESS,
        wordCount: 1800,
        estimatedPrice: 95.4,
        agreedPrice: 95.4,
        currency: "BYN",
        deadlineAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        submittedAt: new Date(),
        acceptedAt: new Date(),
        payment: {
          create: {
            amount: 95.4,
            status: PaymentStatus.HELD,
            heldAt: new Date(),
          },
        },
      },
    });
  }

  const completedTitle = "Локализация интернет-магазина";
  const existingCompleted = await prisma.order.findFirst({
    where: { title: completedTitle, clientId: client.id },
  });
  if (!existingCompleted) {
    const completed = await prisma.order.create({
      data: {
        clientId: client.id,
        translatorId: maria.id,
        title: completedTitle,
        description: "Перевод каталога товаров и checkout EN→RU.",
        sourceLanguage: "en",
        targetLanguage: "ru",
        translationTypeCode: "marketing",
        urgency: OrderUrgency.STANDARD,
        status: OrderStatus.COMPLETED,
        wordCount: 3200,
        estimatedPrice: 168.5,
        agreedPrice: 165,
        currency: "BYN",
        submittedAt: new Date(Date.now() - 20 * 86400000),
        acceptedAt: new Date(Date.now() - 18 * 86400000),
        completedAt: new Date(Date.now() - 5 * 86400000),
        payment: {
          create: {
            amount: 165,
            status: PaymentStatus.RELEASED,
            heldAt: new Date(Date.now() - 17 * 86400000),
            releasedAt: new Date(Date.now() - 5 * 86400000),
          },
        },
      },
    });
    await prisma.review.upsert({
      where: { orderId: completed.id },
      update: {
        rating: 5,
        comment: "Отличное качество, соблюдены сроки и глоссарий бренда. Рекомендую для e-commerce проектов.",
      },
      create: {
        orderId: completed.id,
        authorId: client.id,
        rating: 5,
        comment: "Отличное качество, соблюдены сроки и глоссарий бренда. Рекомендую для e-commerce проектов.",
      },
    });
  }

  const marketTitle = "Перевод презентации для инвесторов";
  if (!(await prisma.order.findFirst({ where: { title: marketTitle, clientId: client.id } }))) {
    await prisma.order.create({
      data: {
        clientId: client.id,
        title: marketTitle,
        description: "15 слайдов, EN→RU, нужен носительский стиль для встречи в Минске.",
        sourceLanguage: "en",
        targetLanguage: "ru",
        translationTypeCode: "marketing",
        urgency: OrderUrgency.EXPRESS,
        status: OrderStatus.SUBMITTED,
        wordCount: 2200,
        estimatedPrice: 142.5,
        currency: "BYN",
        submittedAt: new Date(),
        deadlineAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // Больше демо-отзывов: создаём завершённые заказы и привязанные оценки
  const REVIEW_PACK: Array<{
    title: string;
    description: string;
    translatorIndex: number;
    rating: number;
    comment: string;
    daysAgo: number;
    type: string;
    source: string;
    target: string;
    wordCount: number;
    agreedPrice: number;
  }> = [
    {
      title: "Перевод медицинской инструкции",
      description: "Инструкция к препарату, термины и единицы измерения, форматирование таблиц.",
      translatorIndex: 5, // Наталья Клиник
      rating: 5,
      comment: "Очень внимательная к терминологии, аккуратно оформила таблицы. Сдали раньше срока, без правок.",
      daysAgo: 9,
      type: "medical",
      source: "en",
      target: "ru",
      wordCount: 2400,
      agreedPrice: 149,
    },
    {
      title: "Перевод договора аренды",
      description: "Юридический перевод, важны формулировки и единообразие терминов.",
      translatorIndex: 4, // Дмитрий Польский (legal)
      rating: 5,
      comment: "Формулировки точные, видно опыт. Плюс — предложил глоссарий терминов под наш кейс.",
      daysAgo: 12,
      type: "legal",
      source: "pl",
      target: "ru",
      wordCount: 1900,
      agreedPrice: 108,
    },
    {
      title: "Локализация интерфейса SaaS",
      description: "UI-строки + сообщения об ошибках, важно звучание и консистентность.",
      translatorIndex: 12, // Роман Техписатель
      rating: 5,
      comment: "Классно подогнал microcopy под продукт. Стало «по‑человечески», без кальки. Спасибо!",
      daysAgo: 6,
      type: "technical",
      source: "en",
      target: "ru",
      wordCount: 2600,
      agreedPrice: 120,
    },
    {
      title: "Перевод презентации для выставки",
      description: "Слайды + тезисы спикера, нужен уверенный маркетинговый тон.",
      translatorIndex: 3, // Ольга Французова
      rating: 4,
      comment: "В целом отлично, стиль выдержан. Пару терминов уточнили — быстро внесли правки.",
      daysAgo: 15,
      type: "marketing",
      source: "fr",
      target: "ru",
      wordCount: 2100,
      agreedPrice: 104,
    },
    {
      title: "Перевод руководства по оборудованию",
      description: "Техническое руководство, много обозначений и схем.",
      translatorIndex: 8, // Виктор Шнайдер
      rating: 5,
      comment: "Сложная техническая тема, но перевод точный. Сверстка не поехала, всё структурировано.",
      daysAgo: 22,
      type: "technical",
      source: "de",
      target: "ru",
      wordCount: 3600,
      agreedPrice: 192,
    },
    {
      title: "Перевод описаний товаров (маркетплейс)",
      description: "Карточки товаров + характеристики, важно SEO и единый тон.",
      translatorIndex: 10, // Анна Лендова
      rating: 4,
      comment: "Хорошо, быстро и в одном стиле. Хотелось бы чуть меньше повторов — но поправили за вечер.",
      daysAgo: 18,
      type: "marketing",
      source: "en",
      target: "ru",
      wordCount: 4200,
      agreedPrice: 175,
    },
    {
      title: "Перевод научпоп-статьи",
      description: "Длинный текст, нужен живой стиль без потери смысла.",
      translatorIndex: 7, // Ирина Смирнова
      rating: 5,
      comment: "Супер стиль! Читается легко, но смысл сохранён. Приятно работать.",
      daysAgo: 27,
      type: "general",
      source: "en",
      target: "ru",
      wordCount: 3100,
      agreedPrice: 160,
    },
    {
      title: "Перевод email-цепочки для поддержки",
      description: "Короткие письма, важно быстро и корректно, без официоза.",
      translatorIndex: 6, // Сергей Кодов
      rating: 5,
      comment: "Очень быстро. Тон общения сохранили, формулировки естественные.",
      daysAgo: 4,
      type: "general",
      source: "en",
      target: "ru",
      wordCount: 900,
      agreedPrice: 45,
    },
    // Дополнительные отзывы, чтобы у переводчиков было разное количество
    {
      title: "Перевод пользовательской политики конфиденциальности",
      description: "Юридический текст для сайта, важны точные формулировки и структура.",
      translatorIndex: 0, // Мария
      rating: 5,
      comment: "Аккуратно и уверенно по терминологии. Никаких «кривых» оборотов, всё читабельно.",
      daysAgo: 14,
      type: "legal",
      source: "en",
      target: "ru",
      wordCount: 2100,
      agreedPrice: 115,
    },
    {
      title: "Локализация справочного центра (FAQ)",
      description: "Статьи базы знаний, единый тон, короткие заголовки.",
      translatorIndex: 0, // Мария
      rating: 4,
      comment: "Хорошо выдержан стиль. Пару формулировок попросили упростить — быстро поправили.",
      daysAgo: 30,
      type: "technical",
      source: "en",
      target: "ru",
      wordCount: 2800,
      agreedPrice: 132,
    },
    {
      title: "Перевод выписки из клиники",
      description: "Медицинские сокращения, аккуратность и соответствие оригиналу.",
      translatorIndex: 5, // Наталья
      rating: 5,
      comment: "Понравилось, что уточнила спорные сокращения и оформила максимально понятно.",
      daysAgo: 16,
      type: "medical",
      source: "en",
      target: "ru",
      wordCount: 1200,
      agreedPrice: 78,
    },
    {
      title: "Перевод инструкции к медоборудованию",
      description: "Тех. документ с медицинской терминологией, таблицы и предупреждения.",
      translatorIndex: 2, // Елена
      rating: 5,
      comment: "Очень точный перевод, все предупреждения и единицы измерения на месте. Рекомендую.",
      daysAgo: 19,
      type: "medical",
      source: "zh",
      target: "ru",
      wordCount: 2600,
      agreedPrice: 158,
    },
    {
      title: "Перевод рекламных баннеров и слоганов",
      description: "Короткие формулировки, адаптация под аудиторию.",
      translatorIndex: 3, // Ольга
      rating: 5,
      comment: "Отличная адаптация, звучит естественно. Варианты слоганов — прям в точку.",
      daysAgo: 25,
      type: "marketing",
      source: "fr",
      target: "ru",
      wordCount: 900,
      agreedPrice: 52,
    },
    {
      title: "Перевод договора поставки (DE→RU)",
      description: "Юр. перевод с немецкого, важна точность терминов и ссылок на пункты.",
      translatorIndex: 1, // Алексей
      rating: 4,
      comment: "Сделано качественно. Попросили унифицировать пару терминов — внесли правки быстро.",
      daysAgo: 33,
      type: "legal",
      source: "de",
      target: "ru",
      wordCount: 2300,
      agreedPrice: 128,
    },
    {
      title: "Перевод спецификаций к оборудованию",
      description: "Список характеристик и обозначений, важно не потерять формат.",
      translatorIndex: 8, // Виктор
      rating: 5,
      comment: "Формат и обозначения сохранены. Сверка с оригиналом на уровне.",
      daysAgo: 28,
      type: "technical",
      source: "de",
      target: "ru",
      wordCount: 2000,
      agreedPrice: 112,
    },
    {
      title: "Локализация онбординга приложения",
      description: "Короткие UI-строки, подсказки, уведомления, нужно «живое» звучание.",
      translatorIndex: 12, // Роман
      rating: 5,
      comment: "Очень круто по UX-текстам: лаконично и понятно. Пользователи реально стали меньше путаться.",
      daysAgo: 11,
      type: "technical",
      source: "en",
      target: "ru",
      wordCount: 1400,
      agreedPrice: 69,
    },
    {
      title: "Перевод карточек товаров (одежда)",
      description: "Категории, размеры, состав, важен единый стиль и SEO.",
      translatorIndex: 10, // Анна
      rating: 5,
      comment: "Сделано быстро и ровно по стилю. Отлично зашло для маркетплейса.",
      daysAgo: 8,
      type: "marketing",
      source: "en",
      target: "ru",
      wordCount: 2600,
      agreedPrice: 108,
    },
    {
      title: "Перевод экскурсионного описания",
      description: "Туристический текст, нужен лёгкий стиль и адаптация названий.",
      translatorIndex: 11, // Павел
      rating: 4,
      comment: "Хороший живой стиль. Пару географических названий уточнили — всё ок.",
      daysAgo: 21,
      type: "general",
      source: "es",
      target: "ru",
      wordCount: 1700,
      agreedPrice: 82,
    },
    {
      title: "Нотариальный перевод доверенности",
      description: "Персональные данные, стандартные формулировки, аккуратность.",
      translatorIndex: 12, // Роман
      rating: 5,
      comment: "Всё очень аккуратно, без ошибок по ФИО/датам. Подготовлено удобно для заверения.",
      daysAgo: 13,
      type: "legal",
      source: "en",
      target: "ru",
      wordCount: 1100,
      agreedPrice: 66,
    },
    {
      title: "Сертифицированный перевод справки",
      description: "Короткий документ, важна точность и формат.",
      translatorIndex: 11, // Екатерина
      rating: 5,
      comment: "Сделано быстро и строго по формату. Никаких вопросов у принимающей стороны.",
      daysAgo: 10,
      type: "legal",
      source: "en",
      target: "ru",
      wordCount: 800,
      agreedPrice: 49,
    },
    {
      title: "Перевод технического задания (API)",
      description: "ТЗ для разработчиков, важно не исказить требования и термины.",
      translatorIndex: 6, // Сергей
      rating: 5,
      comment: "Термины точные, читается легко. Идеально для команды разработки.",
      daysAgo: 23,
      type: "technical",
      source: "en",
      target: "ru",
      wordCount: 2600,
      agreedPrice: 118,
    },
    {
      title: "Перевод статьи для блога",
      description: "Статья про продукт, нужен лёгкий стиль без канцелярита.",
      translatorIndex: 7, // Ирина
      rating: 4,
      comment: "Отлично по стилю, чуть поправили пару терминов. В целом очень довольны.",
      daysAgo: 17,
      type: "general",
      source: "en",
      target: "ru",
      wordCount: 2400,
      agreedPrice: 126,
    },
  ];

  for (const item of REVIEW_PACK) {
    const translator = translators[item.translatorIndex] ?? maria;
    const existing = await prisma.order.findFirst({ where: { title: item.title, clientId: client.id } });
    if (existing) continue;

    const now = Date.now();
    const acceptedAt = new Date(now - (item.daysAgo + 3) * 86400000);
    const completedAt = new Date(now - item.daysAgo * 86400000);
    const submittedAt = new Date(now - (item.daysAgo + 4) * 86400000);

    const order = await prisma.order.create({
      data: {
        clientId: client.id,
        translatorId: translator.id,
        title: item.title,
        description: item.description,
        sourceLanguage: item.source,
        targetLanguage: item.target,
        translationTypeCode: item.type,
        urgency: OrderUrgency.STANDARD,
        status: OrderStatus.COMPLETED,
        wordCount: item.wordCount,
        estimatedPrice: item.agreedPrice,
        agreedPrice: item.agreedPrice,
        currency: "BYN",
        submittedAt,
        acceptedAt,
        completedAt,
        payment: {
          create: {
            amount: item.agreedPrice,
            status: PaymentStatus.RELEASED,
            heldAt: acceptedAt,
            releasedAt: completedAt,
          },
        },
      },
    });

    await prisma.review.upsert({
      where: { orderId: order.id },
      update: { rating: item.rating, comment: item.comment },
      create: { orderId: order.id, authorId: client.id, rating: item.rating, comment: item.comment },
    });
  }

  console.log("Seed OK:", { admin: admin.email, client: client.email, translators: translators.length });
  console.log("Переводчики:", TRANSLATORS.map((t) => t.email).join(", "));
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
