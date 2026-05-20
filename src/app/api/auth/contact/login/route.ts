import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getAgentBySubdomain } from "@/lib/db-agents";
import { getContactByEmailAndAgent } from "@/lib/db-contacts";
import { createSession, deleteUserSessions } from "@/lib/db-sessions";
import { logAuditEvent } from "@/lib/db-audit";
import { getVerificationByContactId, deleteVerificationByUserId } from "@/lib/db";
import {
    verifyPassword,
    generateSessionToken,
    contactKycSessionExpiresAt,
    signSessionJwt,
    buildSetCookieHeader,
} from "@/lib/auth";

function extractSubdomain(host: string): string {
    const parts = host.split(".");
    if (parts.length >= 2 && !host.startsWith("localhost") && !host.match(/^[\d.]+$/)) {
        return parts[0];
    }
    // localhost:port — look for agent1.localhost style
    if (host.includes(".localhost")) return host.split(".")[0];
    return "";
}

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json();
        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        const host = req.headers.get("host") ?? "";
        const subdomain = extractSubdomain(host);

        let agent;
        if (subdomain && subdomain !== "www" && subdomain !== "admin") {
            agent = getAgentBySubdomain(subdomain);
            if (!agent) {
                return NextResponse.json({ error: "Unknown agent domain" }, { status: 404 });
            }
        } else {
            return NextResponse.json({ error: "Please use your assigned agent login URL" }, { status: 400 });
        }

        const contact = getContactByEmailAndAgent(email.toLowerCase().trim(), agent.id);
        if (!contact || !contact.is_active) {
            return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        }

        const valid = await verifyPassword(password, contact.password_hash);
        if (!valid) {
            return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        }

        // Enforce single active session — remove all existing sessions for this contact
        deleteUserSessions(contact.id);

        // Always wipe incomplete KYC — no resumption, no handoff to another device
        const existing = getVerificationByContactId(contact.id);
        if (existing) {
            const isComplete =
                !!existing.agreement_path ||
                existing.status === "GREEN" ||
                existing.status === "RED";
            if (!isComplete) {
                if (existing.agent_id && existing.contact_id) {
                    const uploadDir = path.join(
                        process.cwd(), "data", "uploads",
                        String(existing.agent_id), String(existing.contact_id)
                    );
                    try { fs.rmSync(uploadDir, { recursive: true, force: true }); } catch { /* ignore */ }
                }
                deleteVerificationByUserId(String(existing.user_id));
            }
        }

        // Create new session with 30-minute hard TTL
        const sessionId = generateSessionToken();
        const expires = contactKycSessionExpiresAt();
        createSession({ id: sessionId, userType: "contact", userId: contact.id, expiresAt: expires });

        // Embed device fingerprint in JWT for device consistency checks
        const deviceFingerprint = req.headers.get("user-agent") ?? "";
        const jwt = await signSessionJwt({
            sessionId,
            userId: contact.id,
            userType: "contact",
            agentId: agent.id,
            subdomain: agent.subdomain,
            deviceFingerprint,
        });

        logAuditEvent({
            agentId: agent.id,
            contactId: contact.id,
            actorType: "contact",
            actorId: contact.id,
            eventType: "contact.login",
            ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? undefined,
        });

        const res = NextResponse.json({ ok: true });
        res.headers.set("Set-Cookie", buildSetCookieHeader(jwt, "contact", expires));
        return res;
    } catch (err) {
        console.error("[contact/login]", err);
        return NextResponse.json({ error: "Login failed" }, { status: 500 });
    }
}
