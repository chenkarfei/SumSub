#!/usr/bin/env node
/**
 * scripts/reset-admin.js — break-glass password recovery for admins.
 *
 * Usage (on the server, in the project directory):
 *   npm run reset-admin <username>
 *
 * Generates a strong random password, bcrypts it, writes the new hash to
 * the admins table, and prints the temp password to stdout. Also writes
 * an audit_logs row so you have a trail of when/who was reset.
 *
 * The SQLite database file is opened the same way the running app opens
 * it; you do NOT need to stop the app first (SQLite WAL mode handles
 * concurrent reads/writes).
 */

"use strict";
require("dotenv").config({ path: ".env.local" });

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { getDb, getAdminByUsername, createAuditLog } = require("../src/lib/db");

function usage() {
  console.error("Usage: npm run reset-admin <username>");
  console.error("Example: npm run reset-admin admin");
  process.exit(2);
}

/* Generate a friendly, copy-pasteable temp password.
   16 url-safe chars, grouped 4-4-4-4 with dashes for readability. */
function generateTempPassword() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"; // no 0/O/1/I/l
  const out = Array.from(crypto.randomBytes(16))
    .map((b) => alphabet[b % alphabet.length])
    .join("");
  return `${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}-${out.slice(12, 16)}`;
}

async function main() {
  const username = process.argv[2];
  if (!username) usage();

  const admin = getAdminByUsername(username);
  if (!admin) {
    console.error(`✗ No admin found with username '${username}'.`);
    console.error("  Tip: npm run reset-admin admin       (default username)");
    process.exit(1);
  }

  const tempPassword = generateTempPassword();
  const hash = await bcrypt.hash(tempPassword, 12);
  const db = getDb();
  db.prepare("UPDATE admins SET password_hash = ? WHERE id = ?").run(hash, admin.id);

  // Audit trail: record that the CLI reset ran. actor_type="cli" makes it
  // distinguishable from in-app password changes (which are actor_type="admin").
  createAuditLog({
    id: uuidv4(),
    actorType: "cli",
    actorId: process.env.USER || "unknown",
    eventType: "admin.password.cli_reset",
    eventData: { admin_id: admin.id, admin_username: admin.username, hostname: require("os").hostname() },
  });

  console.log("");
  console.log("  ┌──────────────────────────────────────────────────────────┐");
  console.log("  │  ADMIN PASSWORD RESET                                    │");
  console.log("  ├──────────────────────────────────────────────────────────┤");
  console.log(`  │  Username:        ${admin.username.padEnd(39)}│`);
  console.log(`  │  Temporary pw:    ${tempPassword.padEnd(39)}│`);
  console.log("  │                                                          │");
  console.log("  │  Sign in with this password, then immediately change it  │");
  console.log("  │  via the user menu (avatar pill, bottom-left).           │");
  console.log("  └──────────────────────────────────────────────────────────┘");
  console.log("");
  console.log("  This reset has been recorded in the audit log.");
  console.log("");
  process.exit(0);
}

main().catch((err) => {
  console.error("✗ Reset failed:", err.message);
  process.exit(1);
});
