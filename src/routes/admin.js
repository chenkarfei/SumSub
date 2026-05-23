"use strict";
const router = require("express").Router();
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const {
  getAllAgents, getAgentById, createAgent, updateAgent, deleteAgent,
  getAgentContactStats, getContactsByAgent, getContactById, updateContact,
  getVerificationByContactId, getVerificationsByAgentId, getAuditLogsByContact,
  getAdminById, getDb, createAuditLog,
  getPendingResetRequestsForUser, getPendingResetRequestsByType,
  resolveResetRequestsForUser,
} = require("../lib/db");
const { requireAuth } = require("../lib/auth");

const auth = requireAuth("admin");

// GET /api/admin/me
router.get("/me", auth, (req, res) => {
  const admin = getAdminById(req.session.userId);
  if (!admin) return res.status(404).json({ error: "Admin not found" });
  res.json({ id: admin.id, username: admin.username, name: admin.name });
});

// GET /api/admin/agents
router.get("/agents", auth, (req, res) => {
  const agents = getAllAgents().map(a => ({
    ...fmtAgent(a),
    ...getAgentContactStats(a.id),
    pendingResets: getPendingResetRequestsForUser(a.id, "agent").length,
  }));
  res.json(agents);
});

// POST /api/admin/agents
router.post("/agents", auth, async (req, res) => {
  try {
    const { name, email, subdomain, username, password } = req.body;
    if (!name || !email || !subdomain || !username || !password)
      return res.status(400).json({ error: "All fields are required" });
    const passwordHash = await bcrypt.hash(password, 12);
    const agent = createAgent({ id: uuidv4(), subdomain, username, name, email, passwordHash });
    createAuditLog({ id: uuidv4(), agentId: agent.id, contactId: null,
      actorType: "admin", actorId: req.session.userId, eventType: "agent.created",
      eventData: { name: agent.name, subdomain: agent.subdomain },
      ipAddress: (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip || null });
    res.status(201).json(fmtAgent(agent));
  } catch (err) {
    if (err.message?.includes("UNIQUE")) return res.status(409).json({ error: "Agent with that username, email, or subdomain already exists" });
    res.status(500).json({ error: "Failed to create agent" });
  }
});

// GET /api/admin/agents/:id
router.get("/agents/:id", auth, (req, res) => {
  const agent = getAgentById(req.params.id);
  if (!agent) return res.status(404).json({ error: "Not found" });
  const contacts = getContactsByAgent(req.params.id);
  const verifications = getVerificationsByAgentId(req.params.id);
  const vrMap = new Map(verifications.map(v => [v.contact_id, v]));
  const contactRows = contacts.map(c => {
    const vr = vrMap.get(c.id);
    return { id: c.id, name: c.name, email: c.email, isActive: !!c.is_active, status: vr?.status || null, updatedAt: vr?.updated_at || c.updated_at };
  });
  res.json({
    ...fmtAgent(agent),
    contacts: contactRows,
    stats: getAgentContactStats(agent.id),
    pendingResets: getPendingResetRequestsForUser(agent.id, "agent"),
  });
});

// PUT /api/admin/agents/:id
router.put("/agents/:id", auth, async (req, res) => {
  try {
    const { name, email, subdomain, isActive } = req.body;
    const fields = {};
    if (name !== undefined) fields.name = name;
    if (email !== undefined) fields.email = email;
    if (subdomain !== undefined) fields.subdomain = subdomain;
    if (isActive !== undefined) fields.is_active = isActive ? 1 : 0;
    updateAgent(req.params.id, fields);
    res.json({ ok: true });
  } catch (err) {
    if (err.message?.includes("UNIQUE")) return res.status(409).json({ error: "Duplicate value" });
    res.status(500).json({ error: "Update failed" });
  }
});

// DELETE /api/admin/agents/:id
router.delete("/agents/:id", auth, (req, res) => {
  const agent = getAgentById(req.params.id);
  if (agent) {
    createAuditLog({ id: uuidv4(), agentId: agent.id, contactId: null,
      actorType: "admin", actorId: req.session.userId, eventType: "agent.deleted",
      eventData: { name: agent.name, subdomain: agent.subdomain },
      ipAddress: (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip || null });
  }
  deleteAgent(req.params.id);
  res.json({ ok: true });
});

// POST /api/admin/agents/:id/reset-password
router.post("/agents/:id/reset-password", auth, async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  const hash = await bcrypt.hash(password, 12);
  updateAgent(req.params.id, { password_hash: hash });
  // Phase 2: mark any pending reset requests for this agent as resolved.
  resolveResetRequestsForUser(req.params.id, "agent", req.session.userId);
  res.json({ ok: true });
});

// POST /api/admin/agents/bulk-delete
router.post("/agents/bulk-delete", auth, (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "No IDs provided" });
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip || null;
  for (const id of ids) {
    const agent = getAgentById(id);
    if (agent) {
      createAuditLog({ id: uuidv4(), agentId: agent.id, contactId: null,
        actorType: "admin", actorId: req.session.userId, eventType: "agent.deleted",
        eventData: { name: agent.name, subdomain: agent.subdomain }, ipAddress: ip });
    }
    deleteAgent(id);
  }
  res.json({ ok: true, deleted: ids.length });
});

// GET /api/admin/contacts/:id
router.get("/contacts/:id", auth, (req, res) => {
  const c = getContactById(req.params.id);
  if (!c) return res.status(404).json({ error: "Not found" });
  const vr = getVerificationByContactId(c.id);
  const logs = getAuditLogsByContact(c.id);
  res.json({
    id: c.id, agentId: c.agent_id, name: c.name, email: c.email,
    isActive: !!c.is_active, createdAt: c.created_at, updatedAt: c.updated_at,
    verification: vr || null,
    logs,
    pendingResets: getPendingResetRequestsForUser(c.id, "contact"),
  });
});

// PUT /api/admin/contacts/:id
router.put("/contacts/:id", auth, (req, res) => {
  const { isActive } = req.body;
  if (isActive !== undefined) updateContact(req.params.id, { is_active: isActive ? 1 : 0 });
  res.json({ ok: true });
});

// POST /api/admin/contacts/:id/reset-password
router.post("/contacts/:id/reset-password", auth, async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  const c = getContactById(req.params.id);
  if (!c) return res.status(404).json({ error: "Contact not found" });
  const hash = await bcrypt.hash(password, 12);
  getDb().prepare("UPDATE contacts SET password_hash = ? WHERE id = ?").run(hash, c.id);
  resolveResetRequestsForUser(c.id, "contact", req.session.userId);
  res.json({ ok: true });
});

// GET /api/admin/pending-resets — for the user-menu / dashboard "X requests" badge.
// Returns counts grouped by user_type so the admin can decide where to look.
router.get("/pending-resets", auth, (req, res) => {
  res.json({
    admin:   getPendingResetRequestsByType("admin").length,
    agent:   getPendingResetRequestsByType("agent").length,
    contact: getPendingResetRequestsByType("contact").length,
  });
});

// GET /api/admin/logs/:contactId
router.get("/logs/:contactId", auth, (req, res) => {
  const logs = getAuditLogsByContact(req.params.contactId);
  res.json(logs);
});

// POST /api/admin/profile/password
router.post("/profile/password", auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: "Missing fields" });
  if (newPassword.length < 8) return res.status(400).json({ error: "New password must be at least 8 characters" });
  const admin = getAdminById(req.session.userId);
  const ok = await bcrypt.compare(currentPassword, admin.password_hash);
  if (!ok) return res.status(401).json({ error: "Current password is incorrect" });
  if (currentPassword === newPassword) return res.status(400).json({ error: "New password must differ from current password" });
  const hash = await bcrypt.hash(newPassword, 12);
  getDb().prepare("UPDATE admins SET password_hash = ? WHERE id = ?").run(hash, admin.id);
  // Audit trail.
  createAuditLog({
    id: uuidv4(),
    actorType: "admin",
    actorId: admin.id,
    eventType: "admin.password.changed",
    eventData: { username: admin.username },
    ipAddress: (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip || null,
  });
  resolveResetRequestsForUser(admin.id, "admin", admin.id);
  res.json({ ok: true });
});

// GET /api/admin/overview — full dashboard bundle
router.get("/overview", auth, (req, res) => {
  const db = getDb();

  // Pass rate — last 30 days vs previous 30 days
  const cur  = db.prepare("SELECT COUNT(*) c, COALESCE(SUM(CASE WHEN status='GREEN' THEN 1 ELSE 0 END),0) v FROM verification_records WHERE created_at >= datetime('now','-30 days')").get();
  const prev = db.prepare("SELECT COUNT(*) c, COALESCE(SUM(CASE WHEN status='GREEN' THEN 1 ELSE 0 END),0) v FROM verification_records WHERE created_at >= datetime('now','-60 days') AND created_at < datetime('now','-30 days')").get();
  const curRate  = cur.c  ? Math.round((cur.v  / cur.c)  * 100) : 0;
  const prevRate = prev.c ? Math.round((prev.v / prev.c) * 100) : 0;

  // Today stats
  const todaySubmitted = db.prepare("SELECT COUNT(*) c FROM verification_records WHERE date(created_at)=date('now')").get().c;
  const todayInReview  = db.prepare("SELECT COUNT(*) c FROM verification_records WHERE status IN ('processing','pending')").get().c;
  const todayFailed    = db.prepare("SELECT COUNT(*) c FROM verification_records WHERE status IN ('RED','RETRY') AND date(updated_at)=date('now')").get().c;
  const activeAgents   = db.prepare("SELECT COUNT(*) c FROM agents WHERE is_active=1").get().c;
  const resetCount     = ["admin","agent","contact"].reduce((s,t) => s + getPendingResetRequestsByType(t).length, 0);

  // Funnel — last 30 days (4 steps, requires last_login_at)
  const fInvited    = db.prepare("SELECT COUNT(*) c FROM contacts WHERE created_at >= datetime('now','-30 days')").get().c;
  const fRegistered = db.prepare("SELECT COUNT(*) c FROM contacts WHERE created_at >= datetime('now','-30 days') AND last_login_at IS NOT NULL").get().c;
  const fSubmitted  = db.prepare("SELECT COUNT(*) c FROM verification_records WHERE created_at >= datetime('now','-30 days')").get().c;
  const fVerified   = db.prepare("SELECT COUNT(*) c FROM verification_records WHERE status='GREEN' AND created_at >= datetime('now','-30 days')").get().c;

  // Status breakdown — all time
  const statusBreakdown = db.prepare("SELECT status, COUNT(*) count FROM verification_records GROUP BY status ORDER BY count DESC").all();

  // Top 4 agents by contact count
  const topAgents = db.prepare(`
    SELECT a.id, a.name, a.subdomain, COUNT(c.id) cnt
    FROM agents a LEFT JOIN contacts c ON c.agent_id = a.id
    GROUP BY a.id ORDER BY cnt DESC LIMIT 4`).all();

  // Recent activity — last 10 audit logs with context
  const recentActivity = db.prepare(`
    SELECT al.*, ag.name agent_name, ag.subdomain agent_subdomain,
           ct.name contact_name, ct.email contact_email
    FROM audit_logs al
    LEFT JOIN agents ag ON ag.id = al.agent_id
    LEFT JOIN contacts ct ON ct.id = al.contact_id
    WHERE al.created_at >= datetime('now', '-24 hours')
    ORDER BY al.created_at DESC LIMIT 10`).all()
    .map(r => ({ ...r, event_data: r.event_data ? JSON.parse(r.event_data) : null }));

  // Tables info
  const tableNames = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(r => r.name);
  const tableCounts = {}, tableToday = {};
  for (const t of tableNames) {
    tableCounts[t] = db.prepare(`SELECT COUNT(*) c FROM "${t}"`).get().c;
    try { tableToday[t] = db.prepare(`SELECT COUNT(*) c FROM "${t}" WHERE date(created_at)=date('now')`).get().c; }
    catch { tableToday[t] = 0; }
  }
  const pageCount = db.pragma("page_count", { simple: true });
  const pageSize  = db.pragma("page_size",  { simple: true });
  const dbSizeMb  = +((pageCount * pageSize) / (1024 * 1024)).toFixed(1);

  res.json({
    passRate: { rate: curRate, count: cur.v, total: cur.c, delta: curRate - prevRate },
    today: { submitted: todaySubmitted, inReview: todayInReview, failed: todayFailed,
             activeAgents, pendingResets: resetCount },
    funnel: { invited: fInvited, registered: fRegistered, submitted: fSubmitted, verified: fVerified },
    statusBreakdown,
    topAgents,
    recentActivity,
    tables: { names: tableNames, counts: tableCounts, today: tableToday, dbSizeMb },
  });
});

// GET /api/admin/db — export database info
router.get("/db", auth, (req, res) => {
  const db = getDb();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  const stats = {};
  for (const { name } of tables) {
    try {
      stats[name] = db.prepare(`SELECT COUNT(*) as c FROM "${name}"`).get().c;
    } catch { stats[name] = 0; }
  }
  res.json({ tables: tables.map(t => t.name), stats });
});

// GET /api/admin/db/:table — fetch rows from a table (paginated)
router.get("/db/:table", auth, (req, res) => {
  const db = getDb();
  const allowed = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
  if (!allowed.includes(req.params.table)) return res.status(404).json({ error: "Table not found" });
  const page   = Math.max(1, parseInt(req.query.page) || 1);
  const limit  = 50;
  const offset = (page - 1) * limit;
  const total  = db.prepare(`SELECT COUNT(*) as c FROM "${req.params.table}"`).get().c;
  const rows   = db.prepare(`SELECT * FROM "${req.params.table}" LIMIT ? OFFSET ?`).all(limit, offset);
  const safe   = rows.map(r => {
    const copy = { ...r };
    if (copy.password_hash !== undefined) copy.password_hash = "••••••••";
    return copy;
  });
  res.json({ table: req.params.table, total, page, pages: Math.max(1, Math.ceil(total / limit)), rows: safe });
});

function fmtAgent(a) {
  return {
    id: a.id, subdomain: a.subdomain, username: a.username,
    name: a.name, email: a.email, isActive: !!a.is_active,
    agreementTemplatePath: a.agreement_template_path || null,
    createdAt: a.created_at, updatedAt: a.updated_at,
  };
}

module.exports = router;
