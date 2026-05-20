import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { getDb } from "@/lib/db";

const ALLOWED_TABLES = [
    "agents",
    "contacts",
    "verification_records",
    "sessions",
    "audit_logs",
] as const;

type AllowedTable = typeof ALLOWED_TABLES[number];

// Columns to hide from API response (never expose hashes)
const HIDDEN_COLUMNS: Partial<Record<AllowedTable, string[]>> = {
    agents: ["password_hash"],
    contacts: ["password_hash"],
    sessions: [],
};

const PAGE_SIZE = 50;

function buildSearchClause(table: AllowedTable, search: string): { clause: string; params: string[] } {
    const searchableColumns: Partial<Record<AllowedTable, string[]>> = {
        agents: ["subdomain", "name", "email", "username"],
        contacts: ["email", "name"],
        verification_records: ["email", "status", "applicant_id"],
        sessions: ["user_type", "user_id"],
        audit_logs: ["event_type", "actor_type", "contact_id", "agent_id"],
    };

    const cols = searchableColumns[table] ?? [];
    if (!cols.length || !search) return { clause: "", params: [] };

    const clause = "WHERE " + cols.map(c => `${c} LIKE ?`).join(" OR ");
    const params = cols.map(() => `%${search}%`);
    return { clause, params };
}

export async function GET(req: NextRequest) {
    const session = await getAdminSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const table = searchParams.get("table") as AllowedTable | null;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const search = searchParams.get("search") ?? "";

    if (!table || !ALLOWED_TABLES.includes(table)) {
        return NextResponse.json({ error: "Invalid table", allowedTables: ALLOWED_TABLES }, { status: 400 });
    }

    const db = getDb();
    const { clause, params } = buildSearchClause(table, search);
    const offset = (page - 1) * PAGE_SIZE;

    const countResult = db
        .prepare(`SELECT COUNT(*) as c FROM ${table} ${clause}`)
        .get(...params) as { c: number };
    const total = countResult.c;

    const rows = db
        .prepare(`SELECT * FROM ${table} ${clause} ORDER BY rowid DESC LIMIT ? OFFSET ?`)
        .all(...params, PAGE_SIZE, offset) as Record<string, unknown>[];

    // Strip hidden columns
    const hidden = new Set(HIDDEN_COLUMNS[table] ?? []);
    const sanitized = rows.map(row => {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
            if (!hidden.has(k)) out[k] = v;
        }
        return out;
    });

    return NextResponse.json({
        table,
        rows: sanitized,
        total,
        page,
        pageSize: PAGE_SIZE,
        pages: Math.ceil(total / PAGE_SIZE),
    });
}
