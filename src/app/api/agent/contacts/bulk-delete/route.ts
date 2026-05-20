import { NextRequest, NextResponse } from "next/server";
import { getAgentSession } from "@/lib/session";
import { getContactById, deleteContact } from "@/lib/db-contacts";

export async function POST(req: NextRequest) {
    const session = await getAgentSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const ids: unknown = body.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: "ids array is required" }, { status: 400 });
    }

    for (const id of ids) {
        if (typeof id !== "string") continue;
        const contact = getContactById(id);
        if (contact && contact.agent_id === session.agentId) {
            deleteContact(id);
        }
    }

    return NextResponse.json({ ok: true });
}
