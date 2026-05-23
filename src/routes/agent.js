"use strict";
const router = require("express").Router();
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const {
  getAgentById, getContactsByAgent, getContactById, getContactByEmail,
  createContact, updateContact, deleteContact,
  getVerificationByContactId, getVerificationsByAgentId,
  getAuditLogsByContact, getAgentContactStats, getDb, createAuditLog,
  getPendingResetRequestsForUser, getPendingResetRequestsForAgent,
  resolveResetRequestsForUser,
} = require("../lib/db");
const { requireAuth } = require("../lib/auth");

const auth = requireAuth("agent");

// GET /api/agent/me
router.get("/me", auth, (req, res) => {
  const agent = getAgentById(req.session.userId);
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  res.json({ id: agent.id, subdomain: agent.subdomain, username: agent.username, name: agent.name, email: agent.email });
});

// GET /api/agent/contacts
router.get("/contacts", auth, (req, res) => {
  const { search, filter } = req.query;
  const contacts = getContactsByAgent(req.session.userId, search);
  const verifications = getVerificationsByAgentId(req.session.userId);
  const vrMap = new Map(verifications.map(v => [v.contact_id, v]));
  // Build a set of contact_ids with pending resets so we can flag them in the list.
  const pendingForAgent = getPendingResetRequestsForAgent(req.session.userId);
  const pendingByContact = new Set(pendingForAgent.map(p => p.matched_user_id).filter(Boolean));

  let rows = contacts.map(c => {
    const vr = vrMap.get(c.id);
    return {
      id: c.id, name: c.name, email: c.email,
      isActive: !!c.is_active,
      status: vr?.status || null,
      updatedAt: vr?.updated_at || c.updated_at,
      pendingReset: pendingByContact.has(c.id),
    };
  });

  if (filter) {
    rows = rows.filter(r => filter === "none" ? !r.status : r.status === filter);
  }

  const stats = getAgentContactStats(req.session.userId);
  res.json({ contacts: rows, stats, pendingResetCount: pendingForAgent.length });
});

// POST /api/agent/contacts
router.post("/contacts", auth, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
    const exists = getContactByEmail(req.session.userId, email.toLowerCase().trim());
    if (exists) return res.status(409).json({ error: "Contact with this email already exists" });
    const passwordHash = await bcrypt.hash(password, 12);
    const contact = createContact({ id: uuidv4(), agentId: req.session.userId, email: email.toLowerCase().trim(), name: name || null, passwordHash });
    createAuditLog({ id: uuidv4(), agentId: req.session.userId, contactId: contact.id,
      actorType: "agent", actorId: req.session.userId, eventType: "contact.created",
      eventData: { email: contact.email, name: contact.name },
      ipAddress: (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip || null });
    res.status(201).json({ id: contact.id, email: contact.email, name: contact.name });
  } catch (err) {
    if (err.message?.includes("UNIQUE")) return res.status(409).json({ error: "Contact already exists" });
    res.status(500).json({ error: "Failed to create contact" });
  }
});

// GET /api/agent/contacts/:id
router.get("/contacts/:id", auth, (req, res) => {
  const contact = getContactById(req.params.id);
  if (!contact || contact.agent_id !== req.session.userId) return res.status(404).json({ error: "Not found" });
  const vr = getVerificationByContactId(req.params.id);
  res.json({
    id: contact.id, name: contact.name, email: contact.email, isActive: !!contact.is_active,
    verification: vr ? fmtVr(vr) : null,
    pendingResets: getPendingResetRequestsForUser(contact.id, "contact"),
  });
});

// PUT /api/agent/contacts/:id
router.put("/contacts/:id", auth, async (req, res) => {
  const contact = getContactById(req.params.id);
  if (!contact || contact.agent_id !== req.session.userId) return res.status(404).json({ error: "Not found" });
  const fields = {};
  if (req.body.name !== undefined) fields.name = req.body.name;
  if (req.body.isActive !== undefined) fields.is_active = req.body.isActive ? 1 : 0;
  updateContact(req.params.id, fields);
  res.json({ ok: true });
});

// DELETE /api/agent/contacts/:id
router.delete("/contacts/:id", auth, (req, res) => {
  const contact = getContactById(req.params.id);
  if (!contact || contact.agent_id !== req.session.userId) return res.status(404).json({ error: "Not found" });
  createAuditLog({ id: uuidv4(), agentId: req.session.userId, contactId: contact.id,
    actorType: "agent", actorId: req.session.userId, eventType: "contact.deleted",
    eventData: { email: contact.email, name: contact.name },
    ipAddress: (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip || null });
  deleteContact(req.params.id);
  res.json({ ok: true });
});

// POST /api/agent/contacts/:id/reset-password
router.post("/contacts/:id/reset-password", auth, async (req, res) => {
  const contact = getContactById(req.params.id);
  if (!contact || contact.agent_id !== req.session.userId) return res.status(404).json({ error: "Not found" });
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  const hash = await bcrypt.hash(password, 12);
  updateContact(req.params.id, { password_hash: hash });
  resolveResetRequestsForUser(contact.id, "contact", req.session.userId);
  res.json({ ok: true });
});

// POST /api/agent/contacts/bulk-delete
router.post("/contacts/bulk-delete", auth, (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "No IDs provided" });
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip || null;
  for (const id of ids) {
    const c = getContactById(id);
    if (c && c.agent_id === req.session.userId) {
      createAuditLog({ id: uuidv4(), agentId: req.session.userId, contactId: c.id,
        actorType: "agent", actorId: req.session.userId, eventType: "contact.deleted",
        eventData: { email: c.email, name: c.name }, ipAddress: ip });
      deleteContact(id);
    }
  }
  res.json({ ok: true });
});

// GET /api/agent/logs/:contactId
router.get("/logs/:contactId", auth, (req, res) => {
  const contact = getContactById(req.params.contactId);
  if (!contact || contact.agent_id !== req.session.userId) return res.status(404).json({ error: "Not found" });
  res.json(getAuditLogsByContact(req.params.contactId));
});

// POST /api/agent/profile/password
router.post("/profile/password", auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: "Missing fields" });
  if (newPassword.length < 8) return res.status(400).json({ error: "New password must be at least 8 characters" });
  const agent = getAgentById(req.session.userId);
  const ok = await bcrypt.compare(currentPassword, agent.password_hash);
  if (!ok) return res.status(401).json({ error: "Current password is incorrect" });
  if (currentPassword === newPassword) return res.status(400).json({ error: "New password must differ from current password" });
  const hash = await bcrypt.hash(newPassword, 12);
  getDb().prepare("UPDATE agents SET password_hash = ? WHERE id = ?").run(hash, agent.id);
  createAuditLog({
    id: uuidv4(),
    agentId: agent.id,
    actorType: "agent",
    actorId: agent.id,
    eventType: "agent.password.changed",
    eventData: { username: agent.username },
    ipAddress: (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip || null,
  });
  resolveResetRequestsForUser(agent.id, "agent", agent.id);
  res.json({ ok: true });
});

function fmtVr(r) {
  return {
    id: r.id, status: r.status,
    firstName: r.first_name, lastName: r.last_name,
    email: r.email, proofOfAddressPath: r.proof_of_address_path,
    bankStatementPath: r.bank_statement_path, agreementPath: r.agreement_path,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

module.exports = router;
