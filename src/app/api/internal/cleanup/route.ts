import { NextRequest, NextResponse } from "next/server";
import { deleteExpiredSessions } from "@/lib/db-sessions";

// Simple token guard — not a full auth session, just a shared secret
// Call via: GET /api/internal/cleanup?secret=<CLEANUP_SECRET>
export async function GET(req: NextRequest) {
    const secret = process.env.CLEANUP_SECRET;
    if (secret) {
        const provided = new URL(req.url).searchParams.get("secret");
        if (provided !== secret) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
    }

    const deleted = deleteExpiredSessions();
    return NextResponse.json({ ok: true, deletedSessions: deleted });
}
