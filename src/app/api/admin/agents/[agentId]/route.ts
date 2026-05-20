import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { getAgentById, updateAgentStatus, deleteAgent } from "@/lib/db-agents";

export async function GET(
    req: NextRequest,
    { params }: { params: { agentId: string } }
) {
    const session = await getAdminSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const agent = getAgentById(params.agentId);
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    return NextResponse.json({
        id: agent.id,
        subdomain: agent.subdomain,
        username: agent.username,
        name: agent.name,
        email: agent.email,
        isActive: !!agent.is_active,
        createdAt: agent.created_at,
    });
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: { agentId: string } }
) {
    const session = await getAdminSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { isActive } = await req.json();
    if (typeof isActive !== "boolean") {
        return NextResponse.json({ error: "isActive (boolean) is required" }, { status: 400 });
    }

    const agent = getAgentById(params.agentId);
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    updateAgentStatus(params.agentId, isActive);
    return NextResponse.json({ ok: true });
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { agentId: string } }
) {
    const session = await getAdminSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const agent = getAgentById(params.agentId);
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    deleteAgent(params.agentId);
    return NextResponse.json({ ok: true });
}
