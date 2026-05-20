import { NextRequest, NextResponse } from "next/server";
import { getAgentSession } from "@/lib/session";
import { getAgentById, updateAgentPassword } from "@/lib/db-agents";
import { verifyPassword, hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
    const session = await getAgentSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (newPassword.length < 8) {
        return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }

    const agent = getAgentById(session.agentId);
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const valid = await verifyPassword(currentPassword, agent.password_hash);
    if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

    const newHash = await hashPassword(newPassword);
    updateAgentPassword(agent.id, newHash);

    return NextResponse.json({ ok: true });
}
