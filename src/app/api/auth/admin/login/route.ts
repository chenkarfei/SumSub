import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createSession } from "@/lib/db-sessions";
import {
    verifyPassword,
    generateSessionToken,
    sessionExpiresAt,
    signSessionJwt,
    buildSetCookieHeader,
} from "@/lib/auth";

interface AdminRow {
    id: string;
    username: string;
    password_hash: string;
    name: string;
}

export async function POST(req: NextRequest) {
    try {
        const { username, password } = await req.json();
        if (!username || !password) {
            return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
        }

        const admin = getDb()
            .prepare("SELECT * FROM admins WHERE username = ?")
            .get(username.trim()) as AdminRow | undefined;

        if (!admin) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        const valid = await verifyPassword(password, admin.password_hash);
        if (!valid) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        const sessionId = generateSessionToken();
        const expires = sessionExpiresAt();

        createSession({ id: sessionId, userType: "admin", userId: admin.id, expiresAt: expires });

        const jwt = await signSessionJwt({
            sessionId,
            userId: admin.id,
            userType: "admin",
            agentId: null,
            subdomain: null,
        });

        const res = NextResponse.json({ ok: true });
        res.headers.set("Set-Cookie", buildSetCookieHeader(jwt, "admin", expires));
        return res;
    } catch (err) {
        console.error("[admin/login]", err);
        return NextResponse.json({ error: "Login failed" }, { status: 500 });
    }
}
