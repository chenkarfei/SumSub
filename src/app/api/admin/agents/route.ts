import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { getAllAgents, createAgent } from "@/lib/db-agents";
import { hashPassword } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const session = await getAdminSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const agents = getAllAgents().map(a => ({
        id: a.id,
        subdomain: a.subdomain,
        username: a.username,
        name: a.name,
        email: a.email,
        isActive: !!a.is_active,
        createdAt: a.created_at,
    }));

    return NextResponse.json({ agents });
}

export async function POST(req: NextRequest) {
    const session = await getAdminSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { subdomain, username, password, name, email } = await req.json();
    if (!subdomain || !username || !password || !name || !email) {
        return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const agent = createAgent({ subdomain, username, passwordHash, name, email });

    return NextResponse.json({
        id: agent.id,
        subdomain: agent.subdomain,
        name: agent.name,
    }, { status: 201 });
}
