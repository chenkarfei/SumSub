"use strict";
const router = require("express").Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const { getAgentById, updateAgent } = require("../lib/db");
const { requireAuth } = require("../lib/auth");

const UPLOADS_DIR = path.join(__dirname, "../../uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".pdf";
    cb(null, `agreement_template_${uuidv4()}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// GET /api/agreement/template — download the agent's agreement template
router.get("/template", requireAuth("contact"), (req, res) => {
  // find the agent linked to this contact
  const { getContactById } = require("../lib/db");
  const contact = getContactById(req.session.userId);
  if (!contact) return res.status(404).json({ error: "Contact not found" });

  const agent = getAgentById(contact.agent_id);
  if (!agent?.agreement_template_path) return res.status(404).json({ error: "No agreement template available" });

  const filePath = path.join(UPLOADS_DIR, agent.agreement_template_path);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Template file not found" });

  res.download(filePath, "agreement_template.pdf");
});

// POST /api/agreement/upload-template — admin/agent uploads template
router.post("/upload-template", requireAuth("agent"), upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  updateAgent(req.session.userId, { agreement_template_path: req.file.filename });
  res.json({ ok: true, filename: req.file.filename });
});

module.exports = router;
