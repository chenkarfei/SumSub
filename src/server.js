"use strict";
require("dotenv").config({ path: ".env.local" });
const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");

const { cleanExpiredSessions } = require("./lib/db");
const { archiveOldAuditLogs }  = require("./lib/archiver");

const app = express();
const PORT = process.env.PORT || 3004;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Raw body needed for webhook signature verification
app.use("/api/webhook", express.raw({ type: "application/json" }), (req, res, next) => {
  if (Buffer.isBuffer(req.body)) req.body = JSON.parse(req.body.toString());
  next();
});

// Static files
app.use(express.static(path.join(__dirname, "../public"), { index: false, redirect: false }));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
app.use("/api", require("./routes/verify"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/webhook", require("./routes/webhook"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/agent", require("./routes/agent"));
app.use("/api/agreement", require("./routes/agreement"));

// ── HTML fallback — serve the correct HTML page ───────────────────────────────
const PUBLIC = path.join(__dirname, "../public");

app.get("/", (req, res) => res.sendFile(path.join(PUBLIC, "index.html")));
app.get("/login", (req, res) => res.sendFile(path.join(PUBLIC, "login.html")));
app.get("/admin/login", (req, res) => res.sendFile(path.join(PUBLIC, "admin/login.html")));
app.get("/admin/dashboard", (req, res) => res.sendFile(path.join(PUBLIC, "admin/dashboard/overview.html")));
app.get("/admin/dashboard/agents", (req, res) => res.sendFile(path.join(PUBLIC, "admin/dashboard/index.html")));
app.get("/admin/dashboard/agent", (req, res) => res.sendFile(path.join(PUBLIC, "admin/dashboard/agent.html")));
app.get("/admin/dashboard/contact", (req, res) => res.sendFile(path.join(PUBLIC, "admin/dashboard/contact.html")));
app.get("/admin/dashboard/overview", (req, res) => res.redirect(301, "/admin/dashboard"));
app.get("/admin/dashboard/database", (req, res) => res.redirect(301, "/admin/dashboard"));
// NOTE: /admin/dashboard/settings removed in Phase 2 — password change is now
// handled via the user-menu popover (see public/js/user-menu.js). If a stale
// bookmark hits this URL, the route falls through and the user is redirected
// to /admin/dashboard by the dashboard's own auth check.
app.get("/agent/login", (req, res) => res.sendFile(path.join(PUBLIC, "agent/login.html")));
app.get("/agent/dashboard", (req, res) => res.sendFile(path.join(PUBLIC, "agent/dashboard/index.html")));
app.get("/agent/dashboard/contact", (req, res) => res.sendFile(path.join(PUBLIC, "agent/dashboard/contact.html")));
// /agent/dashboard/settings also removed.

// Catch the old settings URLs so stale links don't 404 ugly — redirect home.
app.get("/admin/dashboard/settings", (req, res) => res.redirect("/admin/dashboard"));
app.get("/agent/dashboard/settings", (req, res) => res.redirect("/agent/dashboard"));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`\n  SecureVerify KYC Portal`);
  console.log(`  Running at: http://localhost:${PORT}`);
  console.log(`  Admin:      http://localhost:${PORT}/admin/login`);
  console.log(`  Agent:      http://localhost:${PORT}/agent/login\n`);

  // Session cleanup — purge expired rows hourly (safe: sessions have no compliance value)
  cleanExpiredSessions();
  setInterval(cleanExpiredSessions, 60 * 60 * 1000);

  // Audit log archiving — compress logs older than 12 months to data/archives/ weekly
  archiveOldAuditLogs();
  setInterval(archiveOldAuditLogs, 7 * 24 * 60 * 60 * 1000);
});
