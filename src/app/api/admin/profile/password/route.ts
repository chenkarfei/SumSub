import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import { updateAdminPassword } from "@/lib/db";
import { verifyPassword, hashPassword } from "@/lib/auth";

interface AdminRow { id: string; password_hash: string; }

export async function POST(req: NextRequest) {
    const session = await getAdminSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (newPassword.length < 8) {
        return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }

    const admin = getDb().prepare("SELECT id, password_hash FROM admins WHERE id = ?").get(session.adminId) as AdminRow | undefined;
    if (!admin) return NextResponse.json({ error: "Admin not found" }, { status: 404 });

    const valid = await verifyPassword(currentPassword, admin.password_hash);
    if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

    const newHash = await hashPassword(newPassword);
    updateAdminPassword(admin.id, newHash);

    return NextResponse.json({ ok: true });
}
