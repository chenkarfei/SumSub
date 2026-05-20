import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { getAgentById, deleteAgent } from "@/lib/db-agents";

export async function POST(req: NextRequest) {
    const session = await getAdminSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const ids: unknown = body.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: "ids array is required" }, { status: 400 });
    }

    for (const id of ids) {
        if (typeof id !== "string") continue;
        const agent = getAgentById(id);
        if (agent) deleteAgent(id);
    }

    return NextResponse.json({ ok: true });
}
