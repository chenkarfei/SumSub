"use strict";
const fs   = require("fs");
const path = require("path");
const zlib = require("zlib");
const { getDb } = require("./db");

const ARCHIVE_DIR   = path.join(__dirname, "../../data/archives");
const MONTHS_TO_KEEP = 12;

function archiveOldAuditLogs() {
  const db = getDb();

  if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

  const months = db.prepare(`
    SELECT DISTINCT strftime('%Y-%m', created_at) AS month
    FROM audit_logs
    WHERE created_at < datetime('now', '-${MONTHS_TO_KEEP} months')
    ORDER BY month
  `).all().map(r => r.month);

  if (months.length === 0) return;

  for (const month of months) {
    const filename = `audit_logs_${month}.json.gz`;
    const filepath = path.join(ARCHIVE_DIR, filename);

    if (fs.existsSync(filepath)) {
      db.prepare("DELETE FROM audit_logs WHERE strftime('%Y-%m', created_at) = ?").run(month);
      continue;
    }

    const rows = db.prepare(
      "SELECT * FROM audit_logs WHERE strftime('%Y-%m', created_at) = ?"
    ).all(month);

    if (rows.length === 0) continue;

    try {
      const compressed = zlib.gzipSync(JSON.stringify(rows));
      fs.writeFileSync(filepath, compressed);
      db.prepare("DELETE FROM audit_logs WHERE strftime('%Y-%m', created_at) = ?").run(month);
      console.log(`[archiver] Archived ${rows.length} audit_log rows for ${month} → ${filename}`);
    } catch (err) {
      console.error(`[archiver] Failed to archive ${month}:`, err.message);
    }
  }
}

module.exports = { archiveOldAuditLogs };
