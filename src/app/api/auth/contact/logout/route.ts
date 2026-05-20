import { NextRequest, NextResponse } from "next/server";
import { getContactSession } from "@/lib/session";
import { deleteSession } from "@/lib/db-sessions";
import { logAuditEvent } from "@/lib/db-audit";
import { buildClearCookieHeader } from "@/lib/auth";

export async function POST(req: NextRequest) {
    const session = await getContactSession(req);
    if (session) {
        deleteSession(session.sessionId);
        logAuditEvent({
            agentId: session.agentId,
            contactId: session.contactId,
            actorType: "contact",
            actorId: session.contactId,
            eventType: "contact.logout",
        });
    }
    const res = NextResponse.json({ ok: true });
    res.headers.set("Set-Cookie", buildClearCookieHeader("contact"));
    return res;
}
