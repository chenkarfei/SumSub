/**
 * Migration v2: Add multi-agent/contact auth system to existing single-tenant data.
 *
 * Run once: node scripts/migrate-v2.js
 *
 * What it does:
 *  1. Ensures all new tables exist (agents, admins, contacts, sessions, audit_logs)
 *  2. Seeds a default admin and a default agent from env vars
 *  3. Creates a contacts row for every existing verification_records email
 *  4. Backfills contact_id and agent_id on verification_records
 *  5. Renames data/uploads/<email>/ → data/uploads/<agentId>/<contactId>/
 */

require("dotenv").config({ path: ".env.local" });

const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");

const DB_PATH = process.env.DATABASE_PATH || "./data/kyc.db";
const UPLOADS_DIR = path.resolve("./data/uploads");

function main() {
    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = OFF"); // temporarily off during migration

    console.log("=== KYC Portal v2 Migration ===\n");

    // ── 1. Ensure new tables exist ──────────────────────────────────────────
    console.log("Step 1: Creating new tables if missing...");
    db.exec(`
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

    // Migrate verification_records columns
    const vrCols = db.prepare("PRAGMA table_info(verification_records)").all().map(c => c.name);
    if (!vrCols.includes("contact_id")) {
        db.exec("ALTER TABLE verification_records ADD COLUMN contact_id TEXT");
        console.log("  Added contact_id column to verification_records");
    }
    if (!vrCols.includes("agent_id")) {
        db.exec("ALTER TABLE verification_records ADD COLUMN agent_id TEXT");
        console.log("  Added agent_id column to verification_records");
    }

    console.log("  Done.\n");

    // ── 2. Seed admin ────────────────────────────────────────────────────────
    console.log("Step 2: Seeding admin account...");
    const adminUsername = process.env.SEED_ADMIN_USERNAME || "admin";
    const existing = db.prepare("SELECT id FROM admins WHERE username = ?").get(adminUsername);
    let adminId;
    if (existing) {
        adminId = existing.id;
        console.log(`  Admin '${adminUsername}' already exists, skipping.\n`);
    } else {
        adminId = uuidv4();
        const adminHash = bcrypt.hashSync(process.env.SEED_ADMIN_PASSWORD || "Admin@123!", 12);
        db.prepare("INSERT INTO admins (id, username, password_hash, name) VALUES (?, ?, ?, ?)")
            .run(adminId, adminUsername, adminHash, process.env.SEED_ADMIN_NAME || "System Admin");
        console.log(`  Created admin: ${adminUsername}\n`);
    }

    // ── 3. Seed default agent ────────────────────────────────────────────────
    console.log("Step 3: Seeding default agent account...");
    const agentSubdomain = process.env.SEED_AGENT_SUBDOMAIN || "agent1";
    const existingAgent = db.prepare("SELECT id FROM agents WHERE subdomain = ?").get(agentSubdomain);
    let agentId;
    if (existingAgent) {
        agentId = existingAgent.id;
        console.log(`  Agent '${agentSubdomain}' already exists, skipping.\n`);
    } else {
        agentId = uuidv4();
        const agentHash = bcrypt.hashSync(process.env.SEED_AGENT_PASSWORD || "Agent@123!", 12);
        db.prepare("INSERT INTO agents (id, subdomain, username, password_hash, name, email) VALUES (?, ?, ?, ?, ?, ?)")
            .run(
                agentId,
                agentSubdomain,
                process.env.SEED_AGENT_USERNAME || "agent1",
                agentHash,
                process.env.SEED_AGENT_NAME || "Default Agent",
                process.env.SEED_AGENT_EMAIL || "agent1@example.com"
            );
        console.log(`  Created agent: subdomain=${agentSubdomain}\n`);
    }

    // ── 4. Create contacts for existing verification_records ─────────────────
    console.log("Step 4: Migrating existing verification records to contacts...");
    const records = db.prepare("SELECT * FROM verification_records WHERE contact_id IS NULL").all();
    console.log(`  Found ${records.length} unmigrated records.`);

    const tempPassword = "KycChange@2024!"; // contacts must reset this
    const tempHash = bcrypt.hashSync(tempPassword, 12);

    const migrateRecord = db.transaction((record) => {
        // Check if contact already exists (idempotent)
        let contact = db.prepare("SELECT * FROM contacts WHERE agent_id = ? AND email = ?")
            .get(agentId, record.email);

        if (!contact) {
            const contactId = uuidv4();
            const displayName = [record.first_name, record.last_name].filter(Boolean).join(" ") || null;
            db.prepare("INSERT INTO contacts (id, agent_id, email, password_hash, name) VALUES (?, ?, ?, ?, ?)")
                .run(contactId, agentId, record.email, tempHash, displayName);
            contact = db.prepare("SELECT * FROM contacts WHERE id = ?").get(contactId);

            // Log creation event
            db.prepare(`INSERT INTO audit_logs (id, agent_id, contact_id, actor_type, actor_id, event_type, event_data)
                        VALUES (?, ?, ?, 'system', 'migration', 'contact.created', ?)`)
                .run(uuidv4(), agentId, contact.id, JSON.stringify({ migratedFrom: record.email }));
        }

        // Backfill verification_record
        db.prepare("UPDATE verification_records SET contact_id = ?, agent_id = ? WHERE id = ?")
            .run(contact.id, agentId, record.id);

        return contact;
    });

    let migrated = 0;
    let skipped = 0;
    for (const record of records) {
        const contact = migrateRecord(record);
        if (contact) migrated++;
        else skipped++;
    }
    console.log(`  Migrated: ${migrated}, Skipped (already done): ${skipped}\n`);

    // ── 5. Rename upload directories ──────────────────────────────────────────
    console.log("Step 5: Reorganizing upload directories...");
    const allContacts = db.prepare("SELECT c.id, c.email, vr.proof_of_address_path, vr.bank_statement_path, vr.agreement_path FROM contacts c LEFT JOIN verification_records vr ON vr.contact_id = c.id WHERE c.agent_id = ?").all(agentId);

    let dirsMoved = 0;
    let dirsSkipped = 0;

    for (const row of allContacts) {
        // Old path used the email as folder name (sanitized)
        const safeEmail = row.email.replace(/[^a-zA-Z0-9._-]/g, "_");
        const oldDir = path.join(UPLOADS_DIR, safeEmail);
        const newDir = path.join(UPLOADS_DIR, agentId, row.id);

        if (fs.existsSync(oldDir)) {
            fs.mkdirSync(path.dirname(newDir), { recursive: true });
            fs.renameSync(oldDir, newDir);

            // Update DB paths for each document
            for (const docType of ["proof_of_address", "bank_statement", "agreement"]) {
                const pathCol = `${docType}_path`;
                const oldPath = row[pathCol];
                if (oldPath) {
                    const filename = path.basename(oldPath);
                    const newPath = path.join("data", "uploads", agentId, row.id, filename);
                    db.prepare(`UPDATE verification_records SET ${pathCol} = ? WHERE contact_id = ?`)
                        .run(newPath, row.id);
                }
            }
            dirsMoved++;
        } else {
            dirsSkipped++;
        }
    }
    console.log(`  Moved: ${dirsMoved} directories, Skipped (no uploads): ${dirsSkipped}\n`);

    // ── 6. Create agreements directory ────────────────────────────────────────
    console.log("Step 6: Creating agreements directory structure...");
    const agreementsGlobal = path.resolve("./data/agreements/global");
    fs.mkdirSync(agreementsGlobal, { recursive: true });
    const placeholderPath = path.join(agreementsGlobal, "README.txt");
    if (!fs.existsSync(placeholderPath)) {
        fs.writeFileSync(placeholderPath, "Place the global agreement template PDF here as 'agreement-template.pdf'.\n");
    }
    console.log(`  Created: data/agreements/global/\n`);

    db.pragma("foreign_keys = ON");
    db.close();

    console.log("=== Migration complete ===");
    console.log("\nDefault contact password (for migrated contacts):", tempPassword);
    console.log("Ask all existing contacts to reset their password after first login.\n");
}

main();
