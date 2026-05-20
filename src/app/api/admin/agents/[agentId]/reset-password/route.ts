import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { getAgentById, updateAgentPassword } from "@/lib/db-agents";
import { hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: { agentId: string } }) {
    const session = await getAdminSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const agent = getAgentById(params.agentId);
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const { newPassword } = await req.json();
    if (!newPassword || newPassword.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const hash = await hashPassword(newPassword);
    updateAgentPassword(agent.id, hash);

    return NextResponse.json({ ok: true });
}
