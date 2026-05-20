import { NextRequest, NextResponse } from "next/server";
import { getAgentByUsername } from "@/lib/db-agents";
import { createSession } from "@/lib/db-sessions";
import { logAuditEvent } from "@/lib/db-audit";
import {
    verifyPassword,
    generateSessionToken,
    sessionExpiresAt,
    signSessionJwt,
    buildSetCookieHeader,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        const { username, password } = await req.json();
        if (!username || !password) {
            return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
        }

        const agent = getAgentByUsername(username.trim());
        if (!agent || !agent.is_active) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        const valid = await verifyPassword(password, agent.password_hash);
        if (!valid) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        const sessionId = generateSessionToken();
        const expires = sessionExpiresAt();

        createSession({ id: sessionId, userType: "agent", userId: agent.id, expiresAt: expires });

        const jwt = await signSessionJwt({
            sessionId,
            userId: agent.id,
            userType: "agent",
            agentId: agent.id,
            subdomain: agent.subdomain,
        });

        logAuditEvent({
            agentId: agent.id,
            contactId: null,
            actorType: "agent",
            actorId: agent.id,
            eventType: "agent.login",
            ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? undefined,
        });

        const res = NextResponse.json({ ok: true, subdomain: agent.subdomain });
        res.headers.set("Set-Cookie", buildSetCookieHeader(jwt, "agent", expires));
        return res;
    } catch (err) {
        console.error("[agent/login]", err);
        return NextResponse.json({ error: "Login failed" }, { status: 500 });
    }
}
