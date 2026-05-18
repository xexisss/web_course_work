/**
 * Проверка подключения к PostgreSQL через Prisma.
 * Запуск: npm run check-db (из папки backend)
 */
import { prisma } from "./prisma.js";
async function main() {
    await prisma.$connect();
    const counts = {
        users: await prisma.user.count(),
        orders: await prisma.order.count(),
        translatorProfiles: await prisma.translatorProfile.count(),
    };
    console.log("Подключение к БД успешно. Счётчики таблиц:", counts);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
