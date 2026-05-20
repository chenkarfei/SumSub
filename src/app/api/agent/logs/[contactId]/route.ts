import { NextRequest, NextResponse } from "next/server";
import { getAgentSession } from "@/lib/session";
import { getContactById } from "@/lib/db-contacts";
import { getAuditLogsByContact, countAuditLogsByContact } from "@/lib/db-audit";

export async function GET(
    req: NextRequest,
    { params }: { params: { contactId: string } }
) {
    const session = await getAgentSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify contact belongs to this agent
    const contact = getContactById(params.contactId);
    if (!contact || contact.agent_id !== session.agentId) {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
    const offset = parseInt(searchParams.get("offset") ?? "0");

    const logs = getAuditLogsByContact(params.contactId, limit, offset);
    const total = countAuditLogsByContact(params.contactId);

    const formatted = logs.map(log => ({
        id: log.id,
        actorType: log.actor_type,
        actorId: log.actor_id,
        eventType: log.event_type,
        eventData: log.event_data ? JSON.parse(log.event_data) : null,
        ipAddress: log.ip_address,
        createdAt: log.created_at,
    }));

    return NextResponse.json({ logs: formatted, total, limit, offset });
}
