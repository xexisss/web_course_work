import jwt from "jsonwebtoken";
import { config } from "../config.js";

export function signToken(payload: { sub: string; role: string; email: string }) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: "7d" });
}
