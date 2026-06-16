/** Декоративные изображения (Unsplash, учебный проект) */
export const images = {
  hero: "/img/hero.png",
  auth: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=900&q=80",
  office: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=900&q=80",
  translate: "https://images.unsplash.com/photo-1434030214721-73540b9ae4f4?auto=format&fit=crop&w=900&q=80",
  team: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=80",
  reviews: "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=900&q=80",
  order: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=900&q=80",
  admin: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80",
  cabinet: "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=900&q=80",
};

const avatars = [
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1594744803329-e58b31de8af5?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1507003211169-0b1dd7228f2d?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
];

const portfolio = ["/img/port1.png", "/img/port2.png", "/img/port3.png", "/img/port4.png"];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function shuffledIndices(seed: number): number[] {
  // детерминированный shuffle (Fisher–Yates) по seed
  const arr = [0, 1, 2, 3];
  let x = seed | 0;
  const rnd = () => {
    x = (x * 1664525 + 1013904223) | 0;
    return (x >>> 0) / 4294967296;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

function normName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replaceAll("ё", "е")
    .replaceAll("й", "и")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ");
}

const localAvatarByName: Record<string, string> = {
  [normName("Мария Переводчикова")]: "/img/maria.png",
  [normName("Алексей Немецов")]: "/img/alex.png",
  [normName("Елена Медиченко")]: "/img/elena.png",
  [normName("Ольга Французова")]: "/img/olga.png",
  [normName("Дмитрий Польский")]: "/img/dima.png",
  [normName("Наталья Клиник")]: "/img/nata.png",
  [normName("Сергей Кодов")]: "/img/serg.png",
  [normName("Ирина Смирнова")]: "/img/ira.png",
  [normName("Виктор Шнайдер")]: "/img/viktor.png",
  [normName("Анна Лендова")]: "/img/anna.png",
  [normName("Павел Испанский")]: "/img/pavel.png",
  [normName("Екатерина Нотариус")]: "/img/kate.png",
  [normName("Роман Техписатель")]: "/img/roma.png",
};

export function avatarForUser(userId: string, name?: string): string {
  if (name) {
    const hit = localAvatarByName[normName(name)];
    if (hit) return hit;
  }
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h + userId.charCodeAt(i)) | 0;
  return avatars[Math.abs(h) % avatars.length];
}

export function portfolioImage(index: number): string {
  return portfolio[index % portfolio.length];
}

export function portfolioImageFor(userId: string, index: number): string {
  // "рандомный", но стабильный порядок: перестановка из 4 картинок без повторов
  const perm = shuffledIndices(hashString(userId));
  return portfolio[perm[index % portfolio.length] ?? 0];
}
