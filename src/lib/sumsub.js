"use strict";
require("dotenv").config({ path: ".env.local" });
const crypto = require("crypto");
const fetch = require("node-fetch");

const APP_TOKEN = process.env.SUMSUB_APP_TOKEN || "";
const SECRET_KEY = process.env.SUMSUB_SECRET_KEY || "";
const BASE_URL = "https://api.sumsub.com";
const LEVEL_NAME = process.env.SUMSUB_LEVEL_NAME || "id-and-liveness";

function sign(method, url, body) {
  const ts = Math.floor(Date.now() / 1000).toString();
  const bodyStr = body ? JSON.stringify(body) : "";
  const data = ts + method.toUpperCase() + url + bodyStr;
  const hmac = crypto.createHmac("sha256", SECRET_KEY).update(data).digest("hex");
  return { ts, hmac };
}

async function sumsubRequest(method, path, body) {
  const { ts, hmac } = sign(method, path, body);
  const headers = {
    "X-App-Token": APP_TOKEN,
    "X-App-Access-Sig": hmac,
    "X-App-Access-Ts": ts,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, data: text };
  }
}

async function createApplicant(externalUserId) {
  const path = `/resources/applicants?levelName=${encodeURIComponent(LEVEL_NAME)}`;
  const result = await sumsubRequest("POST", path, { externalUserId });
  if (!result.ok) throw new Error(`Sumsub createApplicant failed: ${JSON.stringify(result.data)}`);
  return result.data;
}

async function getAccessToken(applicantId, externalUserId) {
  const path = `/resources/accessTokens?userId=${encodeURIComponent(externalUserId)}&levelName=${encodeURIComponent(LEVEL_NAME)}`;
  const result = await sumsubRequest("POST", path, {});
  if (!result.ok) throw new Error(`Sumsub getAccessToken failed: ${JSON.stringify(result.data)}`);
  return result.data.token;
}

function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.SUMSUB_WEBHOOK_SECRET || "";
  if (!secret) return true; // skip in dev if not configured
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return signature === expected;
}

module.exports = { createApplicant, getAccessToken, verifyWebhookSignature };
