#!/usr/bin/env node
"use strict";
require("dotenv").config({ path: ".env.local" });
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { getDb } = require("../src/lib/db");

async function main() {
  const db = getDb();

  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminName = process.env.ADMIN_NAME || "Administrator";
  const adminPassword = process.env.ADMIN_PASSWORD || "changeme123";

  const existing = db.prepare("SELECT id FROM admins WHERE username = ?").get(adminUsername);
  if (existing) {
    console.log(`Admin '${adminUsername}' already exists. Skipping.`);
  } else {
    const hash = await bcrypt.hash(adminPassword, 12);
    db.prepare("INSERT INTO admins (id, username, name, password_hash) VALUES (?,?,?,?)")
      .run(uuidv4(), adminUsername, adminName, hash);
    console.log(`✓ Admin created:`);
    console.log(`  Username: ${adminUsername}`);
    console.log(`  Password: ${adminPassword}`);
    console.log(`  (Change the password after first login)`);
  }

  console.log("\n✓ Database initialised successfully.");
  console.log(`  Run 'npm start' to launch the server.\n`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
