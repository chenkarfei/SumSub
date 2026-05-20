import { NextRequest, NextResponse } from "next/server";
import { getAgentSession } from "@/lib/session";
import { getContactById, deleteContact } from "@/lib/db-contacts";
import { getVerificationByContactId, formatVerificationRecord } from "@/lib/db";

export async function GET(
    req: NextRequest,
    { params }: { params: { contactId: string } }
) {
    const session = await getAgentSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const contact = getContactById(params.contactId);
    if (!contact || contact.agent_id !== session.agentId) {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const record = getVerificationByContactId(contact.id);
    const verification = record ? formatVerificationRecord(record) : null;

    return NextResponse.json({
        id: contact.id,
        email: contact.email,
        name: contact.name,
        isActive: !!contact.is_active,
        createdAt: contact.created_at,
        verification,
    });
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { contactId: string } }
) {
    const session = await getAgentSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const contact = getContactById(params.contactId);
    if (!contact || contact.agent_id !== session.agentId) {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    deleteContact(params.contactId);
    return NextResponse.json({ ok: true });
}
