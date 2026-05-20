import { NextRequest, NextResponse } from "next/server";
import { getAgentSession } from "@/lib/session";
import { deleteSession } from "@/lib/db-sessions";
import { logAuditEvent } from "@/lib/db-audit";
import { buildClearCookieHeader } from "@/lib/auth";

export async function POST(req: NextRequest) {
    const session = await getAgentSession(req);
    if (session) {
        deleteSession(session.sessionId);
        logAuditEvent({
            agentId: session.agentId,
            contactId: null,
            actorType: "agent",
            actorId: session.agentId,
            eventType: "agent.logout",
        });
    }
    const host = req.headers.get("host") ?? "";
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    const res = NextResponse.redirect(`${proto}://${host}/agent/login`);
    res.headers.set("Set-Cookie", buildClearCookieHeader("agent"));
    return res;
}
