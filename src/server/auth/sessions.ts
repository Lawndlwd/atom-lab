import crypto from "node:crypto";
import { db } from "../db";

export const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "sid";
const TTL_DAYS = Number(process.env.SESSION_TTL_DAYS ?? 30);
const SECURE =
  process.env.SESSION_COOKIE_SECURE !== "false" && process.env.NODE_ENV === "production";

export function cookieAttrs(expires: Date) {
  const parts = [`Path=/`, `HttpOnly`, `SameSite=Lax`, `Expires=${expires.toUTCString()}`];
  if (SECURE) parts.push("Secure");
  return parts.join("; ");
}

export function clearedCookieAttrs() {
  const parts = [`Path=/`, `HttpOnly`, `SameSite=Lax`, `Max-Age=0`];
  if (SECURE) parts.push("Secure");
  return parts.join("; ");
}

function newSid() {
  return crypto.randomBytes(32).toString("base64url");
}

export async function createSession(userId: string) {
  const id = newSid();
  const expiresAt = new Date(Date.now() + TTL_DAYS * 86_400_000);
  await db.session.create({ data: { id, userId, expiresAt } });
  return { id, expiresAt };
}

export async function deleteSession(id: string) {
  try {
    await db.session.delete({ where: { id } });
  } catch {}
}

export async function purgeExpired() {
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
