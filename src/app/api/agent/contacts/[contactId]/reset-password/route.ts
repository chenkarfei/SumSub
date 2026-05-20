import { NextRequest, NextResponse } from "next/server";
import { getAgentSession } from "@/lib/session";
import { getContactById, updateContactPassword } from "@/lib/db-contacts";
import { hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: { contactId: string } }) {
    const session = await getAgentSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const contact = getContactById(params.contactId);
    if (!contact || contact.agent_id !== session.agentId) {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const { newPassword } = await req.json();
    if (!newPassword || newPassword.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const hash = await hashPassword(newPassword);
    updateContactPassword(contact.id, hash);

    return NextResponse.json({ ok: true });
}
