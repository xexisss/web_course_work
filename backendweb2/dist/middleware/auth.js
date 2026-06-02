import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { prisma } from "../prisma.js";
export function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
        res.status(401).json({ error: "Требуется авторизация" });
        return;
    }
    try {
        const payload = jwt.verify(token, config.jwtSecret);
        req.authUser = { id: payload.sub, role: payload.role, email: payload.email };
        next();
    }
    catch {
        res.status(401).json({ error: "Недействительный токен" });
    }
}
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.authUser) {
            res.status(401).json({ error: "Требуется авторизация" });
            return;
        }
        if (!roles.includes(req.authUser.role)) {
            res.status(403).json({ error: "Недостаточно прав" });
            return;
        }
        next();
    };
}
export async function loadActiveUser(req, res, next) {
    if (!req.authUser)
        return next();
    const user = await prisma.user.findUnique({ where: { id: req.authUser.id } });
    if (!user || !user.isActive) {
        res.status(403).json({ error: "Учётная запись заблокирована" });
        return;
    }
    next();
}
