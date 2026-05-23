"use strict";
require("dotenv").config({ path: ".env.local" });
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DATA_DIR = path.join(__dirname, "../../data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "kyc.db");

let _db = null;

function getDb() {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initSchema(_db);
  }
  return _db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      subdomain TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      agreement_template_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      name TEXT,
      password_hash TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(agent_id, email)
    );

    CREATE TABLE IF NOT EXISTS verification_records (
      id TEXT PRIMARY KEY,
      contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
      agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
      applicant_id TEXT,
      inspection_id TEXT,
      status TEXT NOT NULL DEFAULT 'processing',
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      date_of_birth TEXT NOT NULL,
      nationality TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      country_of_residence TEXT NOT NULL,
      source_of_funds TEXT NOT NULL,
      source_of_wealth TEXT NOT NULL,
      proof_of_address_path TEXT,
      proof_of_address_uploaded_at TEXT,
      bank_statement_path TEXT,
      bank_statement_uploaded_at TEXT,
      agreement_path TEXT,
      agreement_uploaded_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_type TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      agent_id TEXT,
      contact_id TEXT,
      actor_type TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      event_data TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Phase 2: forgot-password requests.
    -- A row is inserted whenever someone clicks "Forgot password?" and submits
    -- an email. Status starts "pending"; flips to "resolved" once the admin/agent
    -- actually resets the password (or "dismissed" if they ignore it).
    CREATE TABLE IF NOT EXISTS password_reset_requests (
      id TEXT PRIMARY KEY,
      user_type TEXT NOT NULL,            -- 'admin' | 'agent' | 'contact'
      submitted_email TEXT NOT NULL,
      matched_user_id TEXT,               -- nullable — we still record requests for unknown emails
      matched_agent_id TEXT,              -- contact's agent, or agent's record id
      status TEXT NOT NULL DEFAULT 'pending', -- pending | resolved | dismissed
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT,
      resolved_by TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_prr_status ON password_reset_requests(status);
    CREATE INDEX IF NOT EXISTS idx_prr_user   ON password_reset_requests(matched_user_id);
  `);
  // Safe migration: add last_login_at to contacts if it doesn't exist yet.
  try { db.prepare("ALTER TABLE contacts ADD COLUMN last_login_at TEXT").run(); } catch {}
}

// ── Agents ────────────────────────────────────────────────────────────────────

function getAllAgents() {
  return getDb().prepare("SELECT * FROM agents ORDER BY created_at DESC").all();
}

function getAgentById(id) {
  return getDb().prepare("SELECT * FROM agents WHERE id = ?").get(id) || null;
}

function getAgentByUsername(username) {
  return getDb().prepare("SELECT * FROM agents WHERE username = ?").get(username) || null;
}

function getAgentByEmail(email) {
  return getDb().prepare("SELECT * FROM agents WHERE email = ?").get(email) || null;
}

function getAgentContactStats(agentId) {
  const db = getDb();
  const total = db.prepare("SELECT COUNT(*) as c FROM contacts WHERE agent_id = ?").get(agentId).c;
  const verified = db.prepare(
    "SELECT COUNT(*) as c FROM verification_records WHERE agent_id = ? AND status = 'GREEN'"
  ).get(agentId).c;
  const pending = db.prepare(
    "SELECT COUNT(*) as c FROM verification_records WHERE agent_id = ? AND status IN ('processing','pending')"
  ).get(agentId).c;
  const failed = db.prepare(
    "SELECT COUNT(*) as c FROM verification_records WHERE agent_id = ? AND status IN ('RED','RETRY')"
  ).get(agentId).c;
  return { total, verified, pending, failed };
}

function createAgent({ id, subdomain, username, name, email, passwordHash }) {
  getDb().prepare(
    "INSERT INTO agents (id, subdomain, username, name, email, password_hash) VALUES (?,?,?,?,?,?)"
  ).run(id, subdomain, username, name, email, passwordHash);
  return getAgentById(id);
}

function updateAgent(id, fields) {
  const sets = Object.keys(fields).map(k => `${k} = ?`).join(", ");
  getDb().prepare(`UPDATE agents SET ${sets}, updated_at = datetime('now') WHERE id = ?`)
    .run(...Object.values(fields), id);
}

function deleteAgent(id) {
  getDb().prepare("DELETE FROM agents WHERE id = ?").run(id);
}

// ── Contacts ──────────────────────────────────────────────────────────────────

function getContactsByAgent(agentId, search) {
  let sql = "SELECT * FROM contacts WHERE agent_id = ?";
  const params = [agentId];
  if (search) {
    sql += " AND (name LIKE ? OR email LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += " ORDER BY created_at DESC";
  return getDb().prepare(sql).all(...params);
}

function getContactById(id) {
  return getDb().prepare("SELECT * FROM contacts WHERE id = ?").get(id) || null;
}

function getContactByEmail(agentId, email) {
  return getDb().prepare("SELECT * FROM contacts WHERE agent_id = ? AND email = ?").get(agentId, email) || null;
}

function getContactByEmailAny(email) {
  return getDb().prepare(
    "SELECT * FROM contacts WHERE email = ? ORDER BY created_at DESC LIMIT 1"
  ).get(email) || null;
}

function createContact({ id, agentId, email, name, passwordHash }) {
  getDb().prepare(
    "INSERT INTO contacts (id, agent_id, email, name, password_hash) VALUES (?,?,?,?,?)"
  ).run(id, agentId, email, name || null, passwordHash);
  return getContactById(id);
}

function updateContact(id, fields) {
  const sets = Object.keys(fields).map(k => `${k} = ?`).join(", ");
  getDb().prepare(`UPDATE contacts SET ${sets}, updated_at = datetime('now') WHERE id = ?`)
    .run(...Object.values(fields), id);
}

function deleteContact(id) {
  getDb().prepare("DELETE FROM contacts WHERE id = ?").run(id);
}

// ── Verification records ───────────────────────────────────────────────────────

function getVerificationByEmail(email) {
  return getDb().prepare(
    "SELECT * FROM verification_records WHERE email = ? ORDER BY created_at DESC LIMIT 1"
  ).get(email) || null;
}

function getVerificationByContactId(contactId) {
  return getDb().prepare(
    "SELECT * FROM verification_records WHERE contact_id = ? ORDER BY created_at DESC LIMIT 1"
  ).get(contactId) || null;
}

function getVerificationsByAgentId(agentId) {
  return getDb().prepare(
    "SELECT * FROM verification_records WHERE agent_id = ? ORDER BY created_at DESC"
  ).all(agentId);
}

function createVerificationRecord(data) {
  const db = getDb();
  db.prepare(`
    INSERT INTO verification_records
      (id, contact_id, agent_id, applicant_id, status, first_name, last_name,
       date_of_birth, nationality, email, phone, country_of_residence,
       source_of_funds, source_of_wealth)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    data.id, data.contactId || null, data.agentId || null, data.applicantId || null,
    data.status || "processing",
    data.firstName, data.lastName, data.dateOfBirth, data.nationality,
    data.email, data.phone || null, data.countryOfResidence,
    data.sourceOfFunds, data.sourceOfWealth
  );
  return db.prepare("SELECT * FROM verification_records WHERE id = ?").get(data.id);
}

function updateVerificationRecord(id, fields) {
  const mapped = {};
  const fieldMap = {
    applicantId: "applicant_id", inspectionId: "inspection_id", status: "status",
    proofOfAddressPath: "proof_of_address_path", proofOfAddressUploadedAt: "proof_of_address_uploaded_at",
    bankStatementPath: "bank_statement_path", bankStatementUploadedAt: "bank_statement_uploaded_at",
    agreementPath: "agreement_path", agreementUploadedAt: "agreement_uploaded_at",
  };
  for (const [k, v] of Object.entries(fields)) {
    mapped[fieldMap[k] || k] = v;
  }
  const sets = Object.keys(mapped).map(k => `${k} = ?`).join(", ");
  getDb().prepare(`UPDATE verification_records SET ${sets}, updated_at = datetime('now') WHERE id = ?`)
    .run(...Object.values(mapped), id);
}

function getVerificationByApplicantId(applicantId) {
  return getDb().prepare("SELECT * FROM verification_records WHERE applicant_id = ?").get(applicantId) || null;
}

// ── Sessions ──────────────────────────────────────────────────────────────────

function createSession({ sessionId, userId, userType, expiresAt }) {
  getDb().prepare(
    "INSERT INTO sessions (session_id, user_id, user_type, expires_at) VALUES (?,?,?,?)"
  ).run(sessionId, userId, userType, expiresAt);
}

function getSession(sessionId) {
  return getDb().prepare(
    "SELECT * FROM sessions WHERE session_id = ? AND expires_at > datetime('now')"
  ).get(sessionId) || null;
}

function deleteSession(sessionId) {
  getDb().prepare("DELETE FROM sessions WHERE session_id = ?").run(sessionId);
}

function deleteSessionsForUser(userId, userType) {
  getDb().prepare("DELETE FROM sessions WHERE user_id = ? AND user_type = ?").run(userId, userType);
}

function cleanExpiredSessions() {
  getDb().prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();
}

// ── Audit logs ────────────────────────────────────────────────────────────────

function createAuditLog({ id, agentId, contactId, actorType, actorId, eventType, eventData, ipAddress }) {
  getDb().prepare(`
    INSERT INTO audit_logs (id, agent_id, contact_id, actor_type, actor_id, event_type, event_data, ip_address)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(
    id, agentId || null, contactId || null, actorType, actorId, eventType,
    eventData ? JSON.stringify(eventData) : null, ipAddress || null
  );
}

function getAuditLogsByContact(contactId) {
  return getDb().prepare(
    "SELECT * FROM audit_logs WHERE contact_id = ? ORDER BY created_at DESC LIMIT 100"
  ).all(contactId).map(row => ({
    ...row,
    event_data: row.event_data ? JSON.parse(row.event_data) : null,
  }));
}

// ── Admins ────────────────────────────────────────────────────────────────────

function getAdminByUsername(username) {
  return getDb().prepare("SELECT * FROM admins WHERE username = ?").get(username) || null;
}

function getAdminById(id) {
  return getDb().prepare("SELECT * FROM admins WHERE id = ?").get(id) || null;
}

function getAllAdmins() {
  return getDb().prepare("SELECT id, username, name, created_at FROM admins").all();
}

// ── Password reset requests (Phase 2) ─────────────────────────────────────────

function createPasswordResetRequest({ id, userType, submittedEmail, matchedUserId, matchedAgentId, ipAddress }) {
  getDb().prepare(`
    INSERT INTO password_reset_requests
      (id, user_type, submitted_email, matched_user_id, matched_agent_id, ip_address)
    VALUES (?,?,?,?,?,?)
  `).run(id, userType, submittedEmail, matchedUserId || null, matchedAgentId || null, ipAddress || null);
}

function getPendingResetRequestsForUser(userId, userType) {
  return getDb().prepare(`
    SELECT * FROM password_reset_requests
    WHERE matched_user_id = ? AND user_type = ? AND status = 'pending'
    ORDER BY created_at DESC
  `).all(userId, userType);
}

function getPendingResetRequestsByType(userType) {
  return getDb().prepare(`
    SELECT * FROM password_reset_requests
    WHERE user_type = ? AND status = 'pending'
    ORDER BY created_at DESC
  `).all(userType);
}

function getPendingResetRequestsForAgent(agentId) {
  return getDb().prepare(`
    SELECT * FROM password_reset_requests
    WHERE matched_agent_id = ? AND user_type = 'contact' AND status = 'pending'
    ORDER BY created_at DESC
  `).all(agentId);
}

function updateContactLastLogin(id) {
  getDb().prepare("UPDATE contacts SET last_login_at = datetime('now') WHERE id = ?").run(id);
}

function resolveResetRequestsForUser(userId, userType, resolvedBy) {
  getDb().prepare(`
    UPDATE password_reset_requests
    SET status = 'resolved', resolved_at = datetime('now'), resolved_by = ?
    WHERE matched_user_id = ? AND user_type = ? AND status = 'pending'
  `).run(resolvedBy, userId, userType);
}

module.exports = {
  getDb,
  getAllAgents, getAgentById, getAgentByUsername, getAgentByEmail, getAgentContactStats,
  createAgent, updateAgent, deleteAgent,
  getContactsByAgent, getContactById, getContactByEmail, getContactByEmailAny,
  createContact, updateContact, deleteContact,
  getVerificationByEmail, getVerificationByContactId, getVerificationsByAgentId,
  createVerificationRecord, updateVerificationRecord, getVerificationByApplicantId,
  createSession, getSession, deleteSession, deleteSessionsForUser, cleanExpiredSessions,
  createAuditLog, getAuditLogsByContact,
  getAdminByUsername, getAdminById, getAllAdmins,
  createPasswordResetRequest, getPendingResetRequestsForUser,
  getPendingResetRequestsByType, getPendingResetRequestsForAgent,
  resolveResetRequestsForUser, updateContactLastLogin,
};
