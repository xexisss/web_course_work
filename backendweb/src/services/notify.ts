import { prisma } from "../prisma.js";

export async function notifyUser(
  userId: string,
  type: string,
  title: string,
  body?: string,
  link?: string,
) {
  await prisma.notification.create({
    data: { userId, type, title, body, link },
  });
}
