import { NextRequest, NextResponse } from "next/server";
import { getContactSession } from "@/lib/session";
import { cookieName, verifySessionJwt } from "@/lib/auth";

export async function POST(req: NextRequest) {
    const session = await getContactSession(req);
    if (!session) {
        return NextResponse.json({ error: "Session expired" }, { status: 403 });
    }

    // Verify device fingerprint — reject if the User-Agent changed since login
    const token = req.cookies.get(cookieName("contact"))?.value;
    const payload = token ? await verifySessionJwt(token) : null;
    const storedFingerprint = (payload as unknown as Record<string, unknown>)?.deviceFingerprint as string ?? "";
    const currentFingerprint = req.headers.get("user-agent") ?? "";

    if (storedFingerprint && currentFingerprint !== storedFingerprint) {
        return NextResponse.json({ error: "Device changed" }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
}
