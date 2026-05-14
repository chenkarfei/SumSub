const crypto = require("crypto");

const WEBHOOK_SECRET = "dummy_webhook_secret"; // Matches .env.local
const APP_URL = "http://localhost:3004";
const APPLICANT_ID = "6a056e40965ee86cfe333735"; // From previous logs or DB

const payload = {
    type: "applicantReviewed",
    applicantId: APPLICANT_ID,
    inspectionId: "test-inspection-id",
    reviewResult: {
        reviewAnswer: "GREEN"
    },
    reviewStatus: "completed",
    createdAt: new Date().toISOString()
};

const body = JSON.stringify(payload);
const signature = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

console.log("Simulating webhook for applicant:", APPLICANT_ID);

fetch(`${APP_URL}/api/webhook`, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "x-payload-digest": signature
    },
    body: body
})
    .then(res => res.json())
    .then(data => console.log("Response:", data))
    .catch(err => console.error("Error:", err));