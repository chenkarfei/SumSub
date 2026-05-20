import { getDb } from "./db";
import { v4 as uuidv4 } from "uuid";

export interface ContactRow {
    id: string;
    agent_id: string;
    email: string;
    password_hash: string;
    name: string | null;
    is_active: number;
    created_at: string;
    updated_at: string;
}

export function getContactById(id: string): ContactRow | undefined {
    return getDb().prepare("SELECT * FROM contacts WHERE id = ?").get(id) as ContactRow | undefined;
}

export function getContactByEmailAndAgent(email: string, agentId: string): ContactRow | undefined {
    return getDb()
        .prepare("SELECT * FROM contacts WHERE email = ? AND agent_id = ?")
        .get(email, agentId) as ContactRow | undefined;
}

export function getContactsByAgent(agentId: string, search?: string): ContactRow[] {
    if (search) {
        return getDb()
            .prepare("SELECT * FROM contacts WHERE agent_id = ? AND (email LIKE ? OR name LIKE ?) ORDER BY created_at DESC")
            .all(agentId, `%${search}%`, `%${search}%`) as ContactRow[];
    }
    return getDb()
        .prepare("SELECT * FROM contacts WHERE agent_id = ? ORDER BY created_at DESC")
        .all(agentId) as ContactRow[];
}

export function getAllContacts(): ContactRow[] {
    return getDb().prepare("SELECT * FROM contacts ORDER BY created_at DESC").all() as ContactRow[];
}

export function createContact(data: {
    agentId: string;
    email: string;
    passwordHash: string;
    name?: string;
}): ContactRow {
    const id = uuidv4();
    getDb()
        .prepare(
            `INSERT INTO contacts (id, agent_id, email, password_hash, name)
             VALUES (?, ?, ?, ?, ?)`
        )
        .run(id, data.agentId, data.email, data.passwordHash, data.name ?? null);
    return getContactById(id)!;
}

export function updateContactName(id: string, name: string): void {
    getDb()
        .prepare("UPDATE contacts SET name = ?, updated_at = datetime('now') WHERE id = ?")
        .run(name, id);
}

export function updateContactPassword(id: string, passwordHash: string): void {
    getDb()
        .prepare("UPDATE contacts SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
        .run(passwordHash, id);
}

export function updateContactStatus(id: string, isActive: boolean): void {
    getDb()
        .prepare("UPDATE contacts SET is_active = ?, updated_at = datetime('now') WHERE id = ?")
        .run(isActive ? 1 : 0, id);
}

export function deleteContact(id: string): void {
    const db = getDb();
    db.transaction(() => {
        db.prepare("DELETE FROM audit_logs WHERE contact_id = ?").run(id);
        db.prepare("DELETE FROM verification_records WHERE contact_id = ?").run(id);
        db.prepare("DELETE FROM sessions WHERE user_type = 'contact' AND user_id = ?").run(id);
        db.prepare("DELETE FROM contacts WHERE id = ?").run(id);
    })();
}
