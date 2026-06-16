import { prisma } from "../prisma.js";
export async function notifyUser(userId, type, title, body, link) {
    await prisma.notification.create({
        data: { userId, type, title, body, link },
    });
}
