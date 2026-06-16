import { OrderStatus, UserRole } from "@prisma/client";
import { prisma } from "./prisma.js";
const maria = await prisma.user.findUnique({ where: { email: "translator@example.local" } });
const orders = await prisma.order.findMany({
    where: { status: { in: [OrderStatus.SUBMITTED, OrderStatus.PENDING_TRANSLATOR] }, translatorId: null },
    take: 5,
});
console.log("maria", maria?.id, maria?.role);
for (const order of orders) {
    const role = UserRole.TRANSLATOR;
    const userId = maria.id;
    const canView = order.clientId === userId ||
        order.translatorId === userId ||
        (role === UserRole.TRANSLATOR &&
            order.clientId !== userId &&
            !order.translatorId &&
            (order.status === OrderStatus.SUBMITTED || order.status === OrderStatus.PENDING_TRANSLATOR));
    console.log({ id: order.id, title: order.title, status: order.status, clientId: order.clientId, canView });
}
await prisma.$disconnect();
