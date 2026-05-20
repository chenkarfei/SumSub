import { getDb } from "./db";
import { v4 as uuidv4 } from "uuid";

export interface AgentRow {
    id: string;
    subdomain: string;
    username: string;
    password_hash: string;
    name: string;
    email: string;
    is_active: number;
    agreement_template_path: string | null;
    created_at: string;
    updated_at: string;
}

export function getAgentById(id: string): AgentRow | undefined {
    return getDb().prepare("SELECT * FROM agents WHERE id = ?").get(id) as AgentRow | undefined;
}

export function getAgentByUsername(username: string): AgentRow | undefined {
    return getDb().prepare("SELECT * FROM agents WHERE username = ?").get(username) as AgentRow | undefined;
}

export function getAgentBySubdomain(subdomain: string): AgentRow | undefined {
    return getDb().prepare("SELECT * FROM agents WHERE subdomain = ? AND is_active = 1").get(subdomain) as AgentRow | undefined;
}

export function getAllAgents(): AgentRow[] {
    return getDb().prepare("SELECT * FROM agents ORDER BY created_at DESC").all() as AgentRow[];
}

export function createAgent(data: {
    subdomain: string;
    username: string;
    passwordHash: string;
    name: string;
    email: string;
}): AgentRow {
    const id = uuidv4();
    getDb()
        .prepare(
            `INSERT INTO agents (id, subdomain, username, password_hash, name, email)
             VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(id, data.subdomain, data.username, data.passwordHash, data.name, data.email);
    return getAgentById(id)!;
}

export function updateAgentStatus(id: string, isActive: boolean): void {
    getDb()
        .prepare("UPDATE agents SET is_active = ?, updated_at = datetime('now') WHERE id = ?")
        .run(isActive ? 1 : 0, id);
}

export function updateAgentTemplate(id: string, templatePath: string | null): void {
    getDb()
        .prepare("UPDATE agents SET agreement_template_path = ?, updated_at = datetime('now') WHERE id = ?")
        .run(templatePath, id);
}

export function updateAgentPassword(id: string, newHash: string): void {
    getDb()
        .prepare("UPDATE agents SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
        .run(newHash, id);
}

export function deleteAgent(id: string): void {
    const db = getDb();
    db.transaction(() => {
        // Get all contact IDs under this agent
        const contacts = db.prepare("SELECT id FROM contacts WHERE agent_id = ?").all(id) as { id: string }[];
        for (const c of contacts) {
            db.prepare("DELETE FROM audit_logs WHERE contact_id = ?").run(c.id);
            db.prepare("DELETE FROM verification_records WHERE contact_id = ?").run(c.id);
            db.prepare("DELETE FROM sessions WHERE user_type = 'contact' AND user_id = ?").run(c.id);
        }
        db.prepare("DELETE FROM contacts WHERE agent_id = ?").run(id);
        db.prepare("DELETE FROM audit_logs WHERE agent_id = ?").run(id);
        db.prepare("DELETE FROM sessions WHERE user_type = 'agent' AND user_id = ?").run(id);
        db.prepare("DELETE FROM agents WHERE id = ?").run(id);
    })();
}

export function getAgentContactStats(agentId: string): {
    total: number;
    verified: number;
    pending: number;
    failed: number;
} {
    const db = getDb();
    const total = (db.prepare("SELECT COUNT(*) as c FROM contacts WHERE agent_id = ?").get(agentId) as { c: number }).c;
    const verified = (db.prepare("SELECT COUNT(*) as c FROM verification_records WHERE agent_id = ? AND status = 'GREEN'").get(agentId) as { c: number }).c;
    const failed = (db.prepare("SELECT COUNT(*) as c FROM verification_records WHERE agent_id = ? AND status IN ('RED','RETRY')").get(agentId) as { c: number }).c;
    return { total, verified, pending: total - verified - failed, failed };
}
