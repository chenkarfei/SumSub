import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import crypto from "crypto";

const BCRYPT_ROUNDS = 12;
const SESSION_DURATION_DAYS = 7;

function getJwtSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET environment variable is not set");
    return new TextEncoder().encode(secret);
}

export async function hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
}

export function generateSessionToken(): string {
    return crypto.randomBytes(32).toString("hex");
}

export function sessionExpiresAt(): Date {
    const d = new Date();
    d.setDate(d.getDate() + SESSION_DURATION_DAYS);
    return d;
}

export function contactKycSessionExpiresAt(): Date {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    return d;
}

export type UserType = "contact" | "agent" | "admin";

const COOKIE_NAMES: Record<UserType, string> = {
    contact: "kyc_contact_session",
    agent: "kyc_agent_session",
    admin: "kyc_admin_session",
};

export function cookieName(userType: UserType): string {
    return COOKIE_NAMES[userType];
}

export interface SessionPayload {
    sessionId: string;
    userId: string;
    userType: UserType;
    agentId: string | null;
    subdomain: string | null;
    deviceFingerprint?: string;
}

export async function signSessionJwt(payload: SessionPayload): Promise<string> {
    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(`${SESSION_DURATION_DAYS}d`)
        .sign(getJwtSecret());
}

export async function verifySessionJwt(token: string): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(token, getJwtSecret());
        return payload as unknown as SessionPayload;
    } catch {
        return null;
    }
}

export function buildSetCookieHeader(token: string, userType: UserType, expires: Date): string {
    const isProduction = process.env.NODE_ENV === "production";
    const parts = [
        `${cookieName(userType)}=${token}`,
        `Path=/`,
        `HttpOnly`,
        `SameSite=Lax`,
        `Expires=${expires.toUTCString()}`,
    ];
    if (isProduction) parts.push("Secure");
    return parts.join("; ");
}

export function buildClearCookieHeader(userType: UserType): string {
    return `${cookieName(userType)}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
