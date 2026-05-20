import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { deleteSession } from "@/lib/db-sessions";
import { buildClearCookieHeader } from "@/lib/auth";

export async function POST(req: NextRequest) {
    const session = await getAdminSession(req);
    if (session) {
        deleteSession(session.sessionId);
    }
    const host = req.headers.get("host") ?? "";
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    const res = NextResponse.redirect(`${proto}://${host}/admin/login`);
    res.headers.set("Set-Cookie", buildClearCookieHeader("admin"));
    return res;
}
