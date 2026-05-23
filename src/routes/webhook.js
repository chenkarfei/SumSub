"use strict";
const router = require("express").Router();
const { v4: uuidv4 } = require("uuid");
const { getVerificationByApplicantId, updateVerificationRecord, createAuditLog } = require("../lib/db");
const { verifyWebhookSignature } = require("../lib/sumsub");

router.post("/", (req, res) => {
  try {
    const sig = req.headers["x-payload-digest"] || req.headers["x-hmac-signature"] || "";
    const rawBody = JSON.stringify(req.body);

    if (!verifyWebhookSignature(rawBody, sig)) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    const payload = req.body;
    const { applicantId, type, reviewStatus, reviewResult } = payload;

    if (!applicantId) return res.status(400).json({ error: "Missing applicantId" });

    const record = getVerificationByApplicantId(applicantId);
    if (!record) return res.status(200).json({ ok: true }); // ignore unknown applicants

    let newStatus = null;
    if (type === "applicantReviewed" || reviewStatus === "completed") {
      const answer = reviewResult?.reviewAnswer;
      if (answer === "GREEN" || answer === "RED") {
        updateVerificationRecord(record.id, { status: answer, inspectionId: payload.inspectionId || null });
        newStatus = answer;
      }
    } else if (reviewStatus === "pending" || reviewStatus === "queued") {
      updateVerificationRecord(record.id, { status: "pending" });
      newStatus = "pending";
    } else if (type === "applicantPending" || reviewStatus === "init") {
      updateVerificationRecord(record.id, { status: "processing" });
      newStatus = "processing";
    }

    if (newStatus) {
      createAuditLog({ id: uuidv4(), agentId: record.agent_id, contactId: record.contact_id,
        actorType: "system", actorId: "sumsub", eventType: "verification.status.changed",
        eventData: { status: newStatus, applicantId }, ipAddress: null });
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("webhook error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

module.exports = router;
