import { cookies } from "next/headers";
import { compare, hash } from "bcryptjs";
import prisma from "./db";

const SESSION_COOKIE = "dashboard_session";
const SESSION_SECRET = process.env.SESSION_SECRET || "default-secret-change-me";

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword);
}

export async function createSession(): Promise<string> {
  const token = Buffer.from(`${Date.now()}-${SESSION_SECRET}-${Math.random()}`).toString("base64");
  return token;
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function getSession(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value || null;
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session;
}

export async function getOrCreateSettings() {
  let settings = await prisma.settings.findUnique({
    where: { id: "global" },
  });

  if (!settings) {
    const defaultPassword = process.env.ADMIN_PASSWORD || "admin";
    const hashedPassword = await hashPassword(defaultPassword);

    settings = await prisma.settings.create({
      data: {
        id: "global",
        adminPassword: hashedPassword,
        dokployUrl: process.env.DOKPLOY_URL || null,
        dokployToken: process.env.DOKPLOY_TOKEN || null,
        claudeApiKey: process.env.ANTHROPIC_API_KEY || null,
      },
    });
  }

  return settings;
}

export async function validateLogin(password: string): Promise<boolean> {
  const settings = await getOrCreateSettings();
  return verifyPassword(password, settings.adminPassword);
}
