"use strict";
const router = require("express").Router();
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const {
  getAdminByUsername, getAgentByUsername, getAgentByEmail,
  getContactByEmail, getContactById, getContactByEmailAny,
  getSession, createPasswordResetRequest,
  createAuditLog, updateContactLastLogin,
} = require("../lib/db");
const { createAuthSession, clearAuthSession, requireAuth, cookieName, verifyToken } = require("../lib/auth");

// ── Helpers ───────────────────────────────────────────────────────────────────

function clientIp(req) {
  return (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip || null;
}

// Generic forgot-password handler factory.
// Always returns 200 ok regardless of whether the email matches — this is
// deliberate. Revealing whether an email exists is an account-enumeration
// leak. Whoever's allowed to do the reset (admins for agents, agents for
// contacts) gets notified via the pending-reset badge on the user's detail
// page; nothing is sent back to the requester beyond a generic confirmation.
function makeForgotHandler(userType, lookup) {
  return async (req, res) => {
    try {
      const email = String(req.body.email || "").toLowerCase().trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "Please enter a valid email address." });
      }
      const matched = lookup(email);
      createPasswordResetRequest({
        id: uuidv4(),
        userType,
        submittedEmail: email,
        matchedUserId: matched?.id || null,
        matchedAgentId: matched?.agent_id || (userType === "agent" ? matched?.id : null),
        ipAddress: clientIp(req),
      });
      // Constant-time-ish: always pretend we did work.
      return res.json({ ok: true });
    } catch (err) {
      console.error("forgot-password error:", err);
      // Even on internal error, don't leak — generic 200.
      return res.json({ ok: true });
    }
  };
}

// ── Admin login ───────────────────────────────────────────────────────────────
router.post("/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Missing credentials" });
    const admin = getAdminByUsername(username);
    if (!admin) return res.status(401).json({ error: "Invalid username or password" });
    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid username or password" });
    createAuthSession(res, "admin", admin.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/logout", (req, res) => {
  const token = req.cookies?.[cookieName("admin")];
  if (token) {
    const payload = verifyToken(token);
    clearAuthSession(res, "admin", payload?.sessionId);
  }
  res.json({ ok: true });
});

// POST /api/auth/admin/forgot-password
// For sole admins this won't actually wake anyone up — the user is told to
// use the CLI script. For multi-admin deployments the pending row shows up
// in /api/admin/pending-resets so other admins can act.
router.post("/admin/forgot-password", (req, res) => {
  const { getAdminByUsername } = require("../lib/db");
  // Admins identify by username but the modal asks for email. We accept either:
  // if it looks like an email, log the raw email; otherwise look up the admin by
  // username and record the request.
  const submitted = String(req.body.email || "").toLowerCase().trim();
  if (!submitted) return res.status(400).json({ error: "Enter your email or username." });
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitted);
  const admin = isEmail ? null : getAdminByUsername(submitted);
  createPasswordResetRequest({
    id: uuidv4(),
    userType: "admin",
    submittedEmail: submitted,
    matchedUserId: admin?.id || null,
    matchedAgentId: null,
    ipAddress: clientIp(req),
  });
  res.json({ ok: true });
});

// ── Agent login ───────────────────────────────────────────────────────────────
router.post("/agent/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Missing credentials" });
    const agent = getAgentByUsername(username);
    if (!agent || !agent.is_active) return res.status(401).json({ error: "Invalid username or password" });
    const ok = await bcrypt.compare(password, agent.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid username or password" });
    createAuthSession(res, "agent", agent.id);
    createAuditLog({ id: uuidv4(), agentId: agent.id, contactId: null,
      actorType: "agent", actorId: agent.id, eventType: "agent.login",
      eventData: { username: agent.username }, ipAddress: clientIp(req) });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/agent/logout", (req, res) => {
  const token = req.cookies?.[cookieName("agent")];
  if (token) {
    const payload = verifyToken(token);
    clearAuthSession(res, "agent", payload?.sessionId);
  }
  res.json({ ok: true });
});

// POST /api/auth/agent/forgot-password
router.post("/agent/forgot-password", makeForgotHandler("agent", (email) => getAgentByEmail(email)));

// ── Contact login ─────────────────────────────────────────────────────────────
router.post("/contact/login", async (req, res) => {
  try {
    const { email, password, agentId } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Missing credentials" });
    const { getDb } = require("../lib/db");
    let contact;
    if (agentId) {
      contact = getContactByEmail(agentId, email.toLowerCase().trim());
    } else {
      contact = getDb().prepare(
        "SELECT * FROM contacts WHERE email = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1"
      ).get(email.toLowerCase().trim());
    }
    if (!contact || !contact.is_active) return res.status(401).json({ error: "Invalid email or password" });
    const ok = await bcrypt.compare(password, contact.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });
    createAuthSession(res, "contact", contact.id);
    updateContactLastLogin(contact.id);
    createAuditLog({ id: uuidv4(), agentId: contact.agent_id, contactId: contact.id,
      actorType: "contact", actorId: contact.id, eventType: "contact.login",
      eventData: { email: contact.email }, ipAddress: clientIp(req) });
    res.json({ ok: true, contactId: contact.id });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/contact/logout", (req, res) => {
  const token = req.cookies?.[cookieName("contact")];
  if (token) {
    const payload = verifyToken(token);
    clearAuthSession(res, "contact", payload?.sessionId);
  }
  res.json({ ok: true });
});

router.post("/contact/heartbeat", requireAuth("contact"), (req, res) => {
  res.json({ ok: true });
});

// POST /api/auth/contact/forgot-password
router.post("/contact/forgot-password", makeForgotHandler("contact", (email) => getContactByEmailAny(email)));

module.exports = router;
