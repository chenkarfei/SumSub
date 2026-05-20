import { NextRequest, NextResponse } from "next/server";
import { getAgentSession } from "@/lib/session";
import { getContactsByAgent, createContact } from "@/lib/db-contacts";
import { getVerificationsByAgentId } from "@/lib/db";
import { logAuditEvent } from "@/lib/db-audit";
import { hashPassword } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const session = await getAgentSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? undefined;

    const contacts = getContactsByAgent(session.agentId, search);
    const verifications = getVerificationsByAgentId(session.agentId);

    // Attach verification status to each contact
    const vrMap = new Map(verifications.map(v => [v.contact_id as string, v]));
    const result = contacts.map(c => ({
        id: c.id,
        email: c.email,
        name: c.name,
        isActive: !!c.is_active,
        createdAt: c.created_at,
        verification: vrMap.has(c.id) ? {
            status: vrMap.get(c.id)!.status,
            updatedAt: vrMap.get(c.id)!.updated_at,
        } : null,
    }));

    return NextResponse.json({ contacts: result, total: result.length });
}

export async function POST(req: NextRequest) {
    const session = await getAgentSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { email, password, name } = await req.json();
    if (!email || !password) {
        return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const contact = createContact({
        agentId: session.agentId,
        email: email.toLowerCase().trim(),
        passwordHash,
        name,
    });

    logAuditEvent({
        agentId: session.agentId,
        contactId: contact.id,
        actorType: "agent",
        actorId: session.agentId,
        eventType: "agent.contact.created",
        eventData: { email: contact.email, name: contact.name },
    });

    return NextResponse.json({
        id: contact.id,
        email: contact.email,
        name: contact.name,
        createdAt: contact.created_at,
    }, { status: 201 });
}
