import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getAgentSession } from "@/lib/session";
import { getAdminSession } from "@/lib/session";
import { updateAgentTemplate } from "@/lib/db-agents";

const MAX_BYTES = 20 * 1024 * 1024; // 20MB for templates

export async function POST(req: NextRequest) {
    // Allow both agent and admin sessions
    const agentSession = await getAgentSession(req);
    const adminSession = agentSession ? null : await getAdminSession(req);

    if (!agentSession && !adminSession) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    // Admin can specify which agent's template to upload; agent can only upload their own
    const targetAgentId = agentSession
        ? agentSession.agentId
        : (searchParams.get("agentId") ?? null);

    const isGlobal = adminSession && searchParams.get("global") === "true";

    if (!isGlobal && !targetAgentId) {
        return NextResponse.json({ error: "Missing agentId parameter" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.type !== "application/pdf") return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 400 });

    const targetDir = isGlobal
        ? path.resolve("data", "agreements", "global")
        : path.resolve("data", "agreements", targetAgentId!);

    fs.mkdirSync(targetDir, { recursive: true });
    const targetPath = path.join(targetDir, "agreement-template.pdf");
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(targetPath, buffer);

    if (!isGlobal && targetAgentId) {
        updateAgentTemplate(targetAgentId, targetPath);
    }

    return NextResponse.json({ ok: true, path: targetPath });
}
