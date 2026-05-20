import { getDb } from "./db";

export interface SessionRow {
    id: string;
    user_type: "admin" | "agent" | "contact";
    user_id: string;
    expires_at: string;
    created_at: string;
}

export function createSession(data: {
    id: string;
    userType: "admin" | "agent" | "contact";
    userId: string;
    expiresAt: Date;
}): void {
    getDb()
        .prepare(
            `INSERT INTO sessions (id, user_type, user_id, expires_at)
             VALUES (?, ?, ?, ?)`
        )
        .run(data.id, data.userType, data.userId, data.expiresAt.toISOString());
}

export function getSession(id: string): SessionRow | undefined {
    return getDb()
        .prepare("SELECT * FROM sessions WHERE id = ? AND expires_at > datetime('now')")
        .get(id) as SessionRow | undefined;
}

export function deleteSession(id: string): void {
    getDb().prepare("DELETE FROM sessions WHERE id = ?").run(id);
}

export function deleteExpiredSessions(): number {
    const result = getDb().prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();
    return result.changes;
}

export function deleteUserSessions(userId: string): void {
    getDb().prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}
