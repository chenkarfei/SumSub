import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getVerificationByContactId, updateDocumentUpload } from "@/lib/db";
import { getContactSession } from "@/lib/session";
import { logAuditEvent } from "@/lib/db-audit";

const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png"]);
const ALLOWED_EXT: Record<string, string> = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
};
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
    try {
        const session = await getContactSession(request);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const documentType = searchParams.get("documentType") as
            | "proof_of_address"
            | "bank_statement"
            | "agreement"
            | null;

        if (!documentType) {
            return NextResponse.json({ error: "Missing documentType" }, { status: 400 });
        }

        if (!["proof_of_address", "bank_statement", "agreement"].includes(documentType)) {
            return NextResponse.json({ error: "Invalid documentType" }, { status: 400 });
        }

        const record = getVerificationByContactId(session.contactId);
        if (!record) {
            return NextResponse.json({ error: "No verification record found" }, { status: 404 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (!ALLOWED_MIME.has(file.type)) {
            logAuditEvent({
                agentId: session.agentId,
                contactId: session.contactId,
                actorType: "contact",
                actorId: session.contactId,
                eventType: "contact.kyc.upload_failed",
                eventData: { documentType, reason: "Invalid file type", fileType: file.type, fileName: file.name },
            });
            return NextResponse.json({ error: "Only PDF, JPG, or PNG files are accepted." }, { status: 400 });
        }

        if (file.size > MAX_BYTES) {
            logAuditEvent({
                agentId: session.agentId,
                contactId: session.contactId,
                actorType: "contact",
                actorId: session.contactId,
                eventType: "contact.kyc.upload_failed",
                eventData: { documentType, reason: "File too large", fileSize: file.size, fileName: file.name },
            });
            return NextResponse.json({ error: "File size must be 10 MB or less." }, { status: 400 });
        }

        const ext = ALLOWED_EXT[file.type];
        // New path: data/uploads/<agentId>/<contactId>/
        const uploadDir = path.join(process.cwd(), "data", "uploads", session.agentId, session.contactId);

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const fileName = `${documentType}.${ext}`;
        const filePath = path.join(uploadDir, fileName);
        const buffer = Buffer.from(await file.arrayBuffer());
        fs.writeFileSync(filePath, buffer);

        const relativePath = path.join("data", "uploads", session.agentId, session.contactId, fileName);
        updateDocumentUpload(session.contactId, documentType, relativePath);

        logAuditEvent({
            agentId: session.agentId,
            contactId: session.contactId,
            actorType: "contact",
            actorId: session.contactId,
            eventType: "contact.kyc.doc_uploaded",
            eventData: {
                documentType,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                path: relativePath,
            },
        });

        // Check if all 3 docs now uploaded → mark kyc.completed
        const updatedRecord = getVerificationByContactId(session.contactId);
        if (
            updatedRecord &&
            updatedRecord.proof_of_address_path &&
            updatedRecord.bank_statement_path &&
            updatedRecord.agreement_path
        ) {
            logAuditEvent({
                agentId: session.agentId,
                contactId: session.contactId,
                actorType: "contact",
                actorId: session.contactId,
                eventType: "contact.kyc.completed",
                eventData: { message: "All 5 KYC steps completed" },
            });
        }

        return NextResponse.json({ success: true, path: relativePath });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
