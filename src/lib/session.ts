import { NextRequest } from "next/server";
import { cookieName, verifySessionJwt, SessionPayload } from "./auth";
import { getSession } from "./db-sessions";
import { getAgentById } from "./db-agents";
import { getContactById } from "./db-contacts";

export interface ContactSession {
    sessionId: string;
    contactId: string;
    agentId: string;
    subdomain: string;
    email: string;
}

export interface AgentSession {
    sessionId: string;
    agentId: string;
    subdomain: string;
    username: string;
}

export interface AdminSession {
    sessionId: string;
    adminId: string;
    username: string;
}

function getTokenFromRequest(req: NextRequest, userType: "contact" | "agent" | "admin"): string | null {
    const cookie = req.cookies.get(cookieName(userType));
    return cookie?.value ?? null;
}

export async function getContactSession(req: NextRequest): Promise<ContactSession | null> {
    const token = getTokenFromRequest(req, "contact");
    if (!token) return null;

    const payload = await verifySessionJwt(token);
    if (!payload || payload.userType !== "contact") return null;

    const dbSession = getSession(payload.sessionId);
    if (!dbSession) return null;

    const contact = getContactById(payload.userId);
    if (!contact || !contact.is_active) return null;

    return {
        sessionId: payload.sessionId,
        contactId: contact.id,
        agentId: contact.agent_id,
        subdomain: payload.subdomain ?? "",
        email: contact.email,
    };
}

export async function getAgentSession(req: NextRequest): Promise<AgentSession | null> {
    const token = getTokenFromRequest(req, "agent");
    if (!token) return null;

    const payload = await verifySessionJwt(token);
    if (!payload || payload.userType !== "agent") return null;

    const dbSession = getSession(payload.sessionId);
    if (!dbSession) return null;

    const agent = getAgentById(payload.userId);
    if (!agent || !agent.is_active) return null;

    return {
        sessionId: payload.sessionId,
        agentId: agent.id,
        subdomain: agent.subdomain,
        username: agent.username,
    };
}

export async function getAdminSession(req: NextRequest): Promise<AdminSession | null> {
    const token = getTokenFromRequest(req, "admin");
    if (!token) return null;

    const payload = await verifySessionJwt(token);
    if (!payload || payload.userType !== "admin") return null;

    const dbSession = getSession(payload.sessionId);
    if (!dbSession) return null;

    return {
        sessionId: payload.sessionId,
        adminId: payload.userId,
        username: (payload as unknown as { username?: string }).username ?? "",
    };
}

export async function getSessionPayloadFromRequest(req: NextRequest): Promise<SessionPayload | null> {
    for (const userType of ["contact", "agent", "admin"] as const) {
        const token = getTokenFromRequest(req, userType);
        if (!token) continue;
        const payload = await verifySessionJwt(token);
        if (payload) return payload;
    }
    return null;
}
