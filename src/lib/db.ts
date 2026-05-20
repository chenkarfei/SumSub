import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
    if (db) return db;

    const dbPath = process.env.DATABASE_PATH || "./data/kyc.db";
    const dir = path.dirname(dbPath);

    // Ensure the data directory exists
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    initializeSchema(db);
    return db;
}

function initializeSchema(db: Database.Database): void {
    db.exec(`
    CREATE TABLE IF NOT EXISTS verification_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      applicant_id TEXT,
      inspection_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      date_of_birth TEXT NOT NULL,
      nationality TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      country_of_residence TEXT NOT NULL,
      source_of_funds TEXT NOT NULL,
      source_of_wealth TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_verification_records_user_id
      ON verification_records(user_id);

    CREATE INDEX IF NOT EXISTS idx_verification_records_applicant_id
      ON verification_records(applicant_id);

    CREATE INDEX IF NOT EXISTS idx_verification_records_status
      ON verification_records(status);

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      subdomain TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      agreement_template_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id),
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(agent_id, email)
    );

    CREATE INDEX IF NOT EXISTS idx_contacts_agent_id ON contacts(agent_id);
    CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_type TEXT NOT NULL CHECK(user_type IN ('admin','agent','contact')),
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      agent_id TEXT REFERENCES agents(id),
      contact_id TEXT REFERENCES contacts(id),
      actor_type TEXT NOT NULL CHECK(actor_type IN ('admin','agent','contact','system')),
      actor_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      event_data TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_audit_logs_agent_id ON audit_logs(agent_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_contact_id ON audit_logs(contact_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
  `);

    // Migrate: add new columns if they don't exist yet
    const columns = (db.prepare("PRAGMA table_info(verification_records)").all() as { name: string }[]).map(c => c.name);
    if (!columns.includes("bank_statement_path")) {
        db.exec("ALTER TABLE verification_records ADD COLUMN bank_statement_path TEXT");
    }
    if (!columns.includes("bank_statement_uploaded_at")) {
        db.exec("ALTER TABLE verification_records ADD COLUMN bank_statement_uploaded_at TEXT");
    }
    if (!columns.includes("agreement_path")) {
        db.exec("ALTER TABLE verification_records ADD COLUMN agreement_path TEXT");
    }
    if (!columns.includes("agreement_uploaded_at")) {
        db.exec("ALTER TABLE verification_records ADD COLUMN agreement_uploaded_at TEXT");
    }
    if (!columns.includes("proof_of_address_path")) {
        db.exec("ALTER TABLE verification_records ADD COLUMN proof_of_address_path TEXT");
    }
    if (!columns.includes("proof_of_address_uploaded_at")) {
        db.exec("ALTER TABLE verification_records ADD COLUMN proof_of_address_uploaded_at TEXT");
    }
    if (!columns.includes("contact_id")) {
        db.exec("ALTER TABLE verification_records ADD COLUMN contact_id TEXT REFERENCES contacts(id)");
    }
    if (!columns.includes("agent_id")) {
        db.exec("ALTER TABLE verification_records ADD COLUMN agent_id TEXT REFERENCES agents(id)");
    }
    if (!columns.includes("kyc_session_id")) {
        db.exec("ALTER TABLE verification_records ADD COLUMN kyc_session_id TEXT");
    }
}

// CRUD operations
export function deleteVerificationByUserId(userId: string) {
    const database = getDb();
    return database
        .prepare("DELETE FROM verification_records WHERE user_id = ?")
        .run(userId);
}

export function getVerificationByUserId(userId: string) {
    const database = getDb();
    return database
        .prepare("SELECT * FROM verification_records WHERE user_id = ?")
        .get(userId) as Record<string, unknown> | undefined;
}

export function getVerificationByContactId(contactId: string) {
    const database = getDb();
    return database
        .prepare("SELECT * FROM verification_records WHERE contact_id = ?")
        .get(contactId) as Record<string, unknown> | undefined;
}

export function getVerificationsByAgentId(agentId: string) {
    const database = getDb();
    return database
        .prepare("SELECT * FROM verification_records WHERE agent_id = ? ORDER BY created_at DESC")
        .all(agentId) as Record<string, unknown>[];
}

export function getVerificationByApplicantId(applicantId: string) {
    const database = getDb();
    return database
        .prepare("SELECT * FROM verification_records WHERE applicant_id = ?")
        .get(applicantId) as Record<string, unknown> | undefined;
}

export function createVerificationRecord(data: {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    nationality: string;
    email: string;
    phone: string;
    countryOfResidence: string;
    sourceOfFunds: string;
    sourceOfWealth: string;
    contactId?: string;
    agentId?: string;
    kycSessionId?: string;
}) {
    const database = getDb();
    return database
        .prepare(
            `INSERT INTO verification_records
       (id, user_id, first_name, last_name, date_of_birth, nationality, email, phone,
        country_of_residence, source_of_funds, source_of_wealth, contact_id, agent_id, kyc_session_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
            data.id,
            data.userId,
            data.firstName,
            data.lastName,
            data.dateOfBirth,
            data.nationality,
            data.email,
            data.phone,
            data.countryOfResidence,
            data.sourceOfFunds,
            data.sourceOfWealth,
            data.contactId ?? null,
            data.agentId ?? null,
            data.kycSessionId ?? null
        );
}

export function updateApplicantId(userId: string, applicantId: string) {
    const database = getDb();
    return database
        .prepare(
            `UPDATE verification_records 
       SET applicant_id = ?, status = 'processing', updated_at = datetime('now')
       WHERE user_id = ?`
        )
        .run(applicantId, userId);
}

export function updateInspectionId(userId: string, inspectionId: string) {
    const database = getDb();
    return database
        .prepare(
            `UPDATE verification_records 
       SET inspection_id = ?, updated_at = datetime('now')
       WHERE user_id = ?`
        )
        .run(inspectionId, userId);
}

export function updateVerificationStatus(
    applicantId: string,
    status: string,
    inspectionId?: string
) {
    const database = getDb();
    const updates: string[] = ["status = ?", "updated_at = datetime('now')"];
    const params: unknown[] = [status];

    if (inspectionId) {
        updates.push("inspection_id = ?");
        params.push(inspectionId);
    }

    params.push(applicantId);

    return database
        .prepare(
            `UPDATE verification_records SET ${updates.join(", ")} WHERE applicant_id = ?`
        )
        .run(...params);
}

/**
 * Resets document uploads and status back to 'processing' when a user
 * re-submits the personal info form for a fresh verification run.
 */
export function resetDocumentUploads(userId: string) {
    const database = getDb();
    return database
        .prepare(
            `UPDATE verification_records
       SET proof_of_address_path = NULL,
           proof_of_address_uploaded_at = NULL,
           bank_statement_path = NULL,
           bank_statement_uploaded_at = NULL,
           agreement_path = NULL,
           agreement_uploaded_at = NULL,
           status = 'processing',
           updated_at = datetime('now')
       WHERE user_id = ?`
        )
        .run(userId);
}

/**
 * Updates the personal information fields for an existing record.
 * Used when a user re-submits the form on a subsequent verification attempt.
 */
export function updatePersonalInfo(
    userId: string,
    data: {
        firstName: string;
        lastName: string;
        dateOfBirth: string;
        nationality: string;
        phone: string;
        countryOfResidence: string;
        sourceOfFunds: string;
        sourceOfWealth: string;
    }
) {
    const database = getDb();
    return database
        .prepare(
            `UPDATE verification_records
       SET first_name = ?,
           last_name = ?,
           date_of_birth = ?,
           nationality = ?,
           phone = ?,
           country_of_residence = ?,
           source_of_funds = ?,
           source_of_wealth = ?,
           updated_at = datetime('now')
       WHERE user_id = ?`
        )
        .run(
            data.firstName,
            data.lastName,
            data.dateOfBirth,
            data.nationality,
            data.phone,
            data.countryOfResidence,
            data.sourceOfFunds,
            data.sourceOfWealth,
            userId
        );
}

export function updateDocumentUpload(
    userId: string,
    documentType: "proof_of_address" | "bank_statement" | "agreement",
    filePath: string
) {
    const database = getDb();
    const pathCol =
        documentType === "proof_of_address" ? "proof_of_address_path" :
        documentType === "bank_statement"   ? "bank_statement_path"   :
                                              "agreement_path";
    const tsCol =
        documentType === "proof_of_address" ? "proof_of_address_uploaded_at" :
        documentType === "bank_statement"   ? "bank_statement_uploaded_at"   :
                                              "agreement_uploaded_at";
    return database
        .prepare(
            `UPDATE verification_records
       SET ${pathCol} = ?, ${tsCol} = datetime('now'), updated_at = datetime('now')
       WHERE contact_id = ?`
        )
        .run(filePath, userId);
}

export function updateAdminPassword(id: string, newHash: string): void {
    getDb()
        .prepare("UPDATE admins SET password_hash = ? WHERE id = ?")
        .run(newHash, id);
}

export function updateKycSessionId(contactId: string, sessionId: string): void {
    getDb()
        .prepare(
            "UPDATE verification_records SET kyc_session_id = ?, updated_at = datetime('now') WHERE contact_id = ?"
        )
        .run(sessionId, contactId);
}

// Format a DB row for client consumption
export function formatVerificationRecord(
    row: Record<string, unknown> | undefined
) {
    if (!row) return null;
    return {
        id: row.id as string,
        userId: row.user_id as string,
        applicantId: (row.applicant_id as string) || null,
        inspectionId: (row.inspection_id as string) || null,
        status: row.status as string,
        firstName: row.first_name as string,
        lastName: row.last_name as string,
        dateOfBirth: row.date_of_birth as string,
        nationality: row.nationality as string,
        email: row.email as string,
        phone: row.phone as string,
        countryOfResidence: row.country_of_residence as string,
        sourceOfFunds: row.source_of_funds as string,
        sourceOfWealth: row.source_of_wealth as string,
        proofOfAddressPath: (row.proof_of_address_path as string) || null,
        proofOfAddressUploadedAt: (row.proof_of_address_uploaded_at as string) || null,
        bankStatementPath: (row.bank_statement_path as string) || null,
        bankStatementUploadedAt: (row.bank_statement_uploaded_at as string) || null,
        agreementPath: (row.agreement_path as string) || null,
        agreementUploadedAt: (row.agreement_uploaded_at as string) || null,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
    };
}