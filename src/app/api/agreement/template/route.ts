import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getContactSession } from "@/lib/session";
import { getAgentById } from "@/lib/db-agents";
import { logAuditEvent } from "@/lib/db-audit";

export async function GET(req: NextRequest) {
    const session = await getContactSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const agent = getAgentById(session.agentId);

    // Resolve template: per-agent override → global fallback
    const agentTemplatePath = path.resolve("data", "agreements", session.agentId, "agreement-template.pdf");
    const globalTemplatePath = path.resolve("data", "agreements", "global", "agreement-template.pdf");

    let templatePath: string | null = null;
    if (agent?.agreement_template_path && fs.existsSync(path.resolve(agent.agreement_template_path))) {
        templatePath = path.resolve(agent.agreement_template_path);
    } else if (fs.existsSync(agentTemplatePath)) {
        templatePath = agentTemplatePath;
    } else if (fs.existsSync(globalTemplatePath)) {
        templatePath = globalTemplatePath;
    }

    if (!templatePath) {
        return NextResponse.json(
            { error: "No agreement template is configured yet. Contact your agent." },
            { status: 404 }
        );
    }

    logAuditEvent({
        agentId: session.agentId,
        contactId: session.contactId,
        actorType: "contact",
        actorId: session.contactId,
        eventType: "agreement.downloaded",
        ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? undefined,
    });

    const fileBuffer = fs.readFileSync(templatePath);
    return new NextResponse(fileBuffer, {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'attachment; filename="agreement-template.pdf"',
            "Content-Length": String(fileBuffer.length),
        },
    });
}
