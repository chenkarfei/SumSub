import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getVerificationByUserId, updateDocumentUpload } from "@/lib/db";

const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png"]);
const ALLOWED_EXT: Record<string, string> = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
};
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");
        const documentType = searchParams.get("documentType") as "proof_of_address" | "bank_statement" | "agreement" | null;

        if (!userId || !documentType) {
            return NextResponse.json({ error: "Missing userId or documentType" }, { status: 400 });
        }

        if (documentType !== "proof_of_address" && documentType !== "bank_statement" && documentType !== "agreement") {
            return NextResponse.json({ error: "Invalid documentType" }, { status: 400 });
        }

        const record = getVerificationByUserId(userId);
        if (!record) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (!ALLOWED_MIME.has(file.type)) {
            return NextResponse.json({ error: "Only PDF, JPG, or PNG files are accepted." }, { status: 400 });
        }

        if (file.size > MAX_BYTES) {
            return NextResponse.json({ error: "File size must be 10 MB or less." }, { status: 400 });
        }

        const ext = ALLOWED_EXT[file.type];
        const safeUserId = userId.replace(/[^a-zA-Z0-9@._-]/g, "_");
        const uploadDir = path.join(process.cwd(), "data", "uploads", safeUserId);

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const fileName = `${documentType}.${ext}`;
        const filePath = path.join(uploadDir, fileName);

        const buffer = Buffer.from(await file.arrayBuffer());
        fs.writeFileSync(filePath, buffer);

        const relativePath = path.join("data", "uploads", safeUserId, fileName);
        updateDocumentUpload(userId, documentType, relativePath);

        return NextResponse.json({ success: true, path: relativePath });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
