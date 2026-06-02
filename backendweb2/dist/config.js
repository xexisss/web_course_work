import "dotenv/config";
const port = Number(process.env.PORT ?? 4000);
const jwtSecret = process.env.JWT_SECRET ?? "dev-secret-change-in-production";
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";
const uploadDir = process.env.UPLOAD_DIR ?? "uploads";
export const config = { port, jwtSecret, corsOrigin, uploadDir };
