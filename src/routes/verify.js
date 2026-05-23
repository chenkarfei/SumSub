"use strict";
const router = require("express").Router();
const { v4: uuidv4 } = require("uuid");
const {
  getVerificationByEmail, createVerificationRecord,
  getContactById, getAgentById,
} = require("../lib/db");
const { requireAuth } = require("../lib/auth");
const { createApplicant, getAccessToken } = require("../lib/sumsub");

// POST /api/verify — create/resume applicant
router.post("/verify", requireAuth("contact"), async (req, res) => {
  try {
    const contactId = req.session.userId;
    const contact = getContactById(contactId);
    if (!contact) return res.status(404).json({ error: "Contact not found" });

    const body = req.body;
    const email = (body.email || contact.email).toLowerCase().trim();

    // Resume existing record
    let record = getVerificationByEmail(email);
    if (record) {
      const token = await getAccessToken(record.applicant_id, email);
      return res.json({ record: formatRecord(record), accessToken: token });
    }

    // Validate required fields
    const required = ["firstName", "lastName", "dateOfBirth", "nationality",
      "email", "countryOfResidence", "sourceOfFunds", "sourceOfWealth"];
    for (const f of required) {
      if (!body[f]) return res.status(400).json({ error: `Missing field: ${f}` });
    }

    const applicant = await createApplicant(email);
    const recordId = uuidv4();
    record = createVerificationRecord({
      id: recordId,
      contactId,
      agentId: contact.agent_id,
      applicantId: applicant.id,
      status: "processing",
      firstName: body.firstName,
      lastName: body.lastName,
      dateOfBirth: body.dateOfBirth,
      nationality: body.nationality,
      email,
      phone: body.phone || "",
      countryOfResidence: body.countryOfResidence,
      sourceOfFunds: body.sourceOfFunds,
      sourceOfWealth: body.sourceOfWealth,
    });

    const token = await getAccessToken(applicant.id, email);
    res.json({ record: formatRecord(record), accessToken: token });
  } catch (err) {
    console.error("verify error:", err);
    res.status(500).json({ error: err.message || "Failed to start verification" });
  }
});

// GET /api/user?userId=email
router.get("/user", requireAuth("contact"), (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "Missing userId" });
  const record = getVerificationByEmail(userId.toLowerCase().trim());
  if (!record) return res.status(404).json({ error: "Not found" });
  res.json(formatRecord(record));
});

function formatRecord(r) {
  return {
    id: r.id,
    contactId: r.contact_id,
    agentId: r.agent_id,
    applicantId: r.applicant_id,
    inspectionId: r.inspection_id,
    status: r.status,
    firstName: r.first_name,
    lastName: r.last_name,
    dateOfBirth: r.date_of_birth,
    nationality: r.nationality,
    email: r.email,
    phone: r.phone,
    countryOfResidence: r.country_of_residence,
    sourceOfFunds: r.source_of_funds,
    sourceOfWealth: r.source_of_wealth,
    proofOfAddressPath: r.proof_of_address_path,
    bankStatementPath: r.bank_statement_path,
    agreementPath: r.agreement_path,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

module.exports = router;
