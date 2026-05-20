import { getDb } from "./db";
import { v4 as uuidv4 } from "uuid";

export type AuditEventType =
    | "contact.created"
    | "contact.login"
    | "contact.logout"
    | "contact.kyc.step_started"
    | "contact.kyc.step_completed"
    | "contact.kyc.doc_uploaded"
    | "contact.kyc.upload_failed"
    | "contact.kyc.sumsub_result"
    | "contact.kyc.completed"
    | "agreement.downloaded"
    | "agent.login"
    | "agent.logout"
    | "agent.contact.created";

export interface AuditLogRow {
    id: string;
    agent_id: string | null;
    contact_id: string | null;
    actor_type: "admin" | "agent" | "contact" | "system";
    actor_id: string;
    event_type: AuditEventType;
    event_data: string | null;
    ip_address: string | null;
    created_at: string;
}

export function logAuditEvent(params: {
    agentId: string | null;
    contactId: string | null;
    actorType: "admin" | "agent" | "contact" | "system";
    actorId: string;
    eventType: AuditEventType;
    eventData?: Record<string, unknown>;
    ipAddress?: string;
}): void {
    getDb()
        .prepare(
            `INSERT INTO audit_logs (id, agent_id, contact_id, actor_type, actor_id, event_type, event_data, ip_address)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
            uuidv4(),
            params.agentId ?? null,
            params.contactId ?? null,
            params.actorType,
            params.actorId,
            params.eventType,
            params.eventData ? JSON.stringify(params.eventData) : null,
            params.ipAddress ?? null
        );
}

export function getAuditLogsByContact(
    contactId: string,
    limit = 50,
    offset = 0
): AuditLogRow[] {
    return getDb()
        .prepare(
            `SELECT * FROM audit_logs WHERE contact_id = ?
             ORDER BY created_at DESC LIMIT ? OFFSET ?`
        )
        .all(contactId, limit, offset) as AuditLogRow[];
}

export function getAuditLogsByAgent(
    agentId: string,
    limit = 100,
    offset = 0
): AuditLogRow[] {
    return getDb()
        .prepare(
            `SELECT * FROM audit_logs WHERE agent_id = ?
             ORDER BY created_at DESC LIMIT ? OFFSET ?`
        )
        .all(agentId, limit, offset) as AuditLogRow[];
}

export function countAuditLogsByContact(contactId: string): number {
    const row = getDb()
        .prepare("SELECT COUNT(*) as c FROM audit_logs WHERE contact_id = ?")
        .get(contactId) as { c: number };
    return row.c;
}
