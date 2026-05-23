"use strict";
const router = require("express").Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const { getContactById, getVerificationByEmail, updateVerificationRecord } = require("../lib/db");
const { requireAuth } = require("../lib/auth");

const UPLOADS_DIR = path.join(__dirname, "../../uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_SIZE = 10 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only PDF, JPG, and PNG files are accepted"));
  },
});

const DOCUMENT_FIELDS = {
  proof_of_address: { pathField: "proofOfAddressPath", dateField: "proofOfAddressUploadedAt" },
  bank_statement: { pathField: "bankStatementPath", dateField: "bankStatementUploadedAt" },
  agreement: { pathField: "agreementPath", dateField: "agreementUploadedAt" },
};

router.post("/", requireAuth("contact"), upload.single("file"), async (req, res) => {
  try {
    const { documentType } = req.query;
    const fieldInfo = DOCUMENT_FIELDS[documentType];
    if (!fieldInfo) return res.status(400).json({ error: "Invalid documentType" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const contact = getContactById(req.session.userId);
    if (!contact) return res.status(404).json({ error: "Contact not found" });

    const record = getVerificationByEmail(contact.email);
    if (!record) return res.status(404).json({ error: "No verification record found" });

    updateVerificationRecord(record.id, {
      [fieldInfo.pathField]: req.file.filename,
      [fieldInfo.dateField]: new Date().toISOString(),
    });

    res.json({ ok: true, filename: req.file.filename });
  } catch (err) {
    if (err.message?.includes("Only PDF")) return res.status(400).json({ error: err.message });
    if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "File too large (max 10 MB)" });
    console.error("upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

module.exports = router;
