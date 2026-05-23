"use strict";
require("dotenv").config({ path: ".env.local" });
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { createSession, getSession, deleteSession } = require("./db");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const SESSION_TTL_HOURS = 24;

const COOKIE_NAMES = {
  admin: "kyc_admin_session",
  agent: "kyc_agent_session",
  contact: "kyc_contact_session",
};

function cookieName(userType) {
  return COOKIE_NAMES[userType] || `kyc_${userType}_session`;
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: `${SESSION_TTL_HOURS}h` });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function createAuthSession(res, userType, userId) {
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString();

  createSession({ sessionId, userId, userType, expiresAt });

  const token = signToken({ sessionId, userId, userType });

  res.cookie(cookieName(userType), token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: SESSION_TTL_HOURS * 60 * 60 * 1000,
    path: "/",
  });

  return { sessionId, token };
}

function clearAuthSession(res, userType, sessionId) {
  if (sessionId) deleteSession(sessionId);
  res.clearCookie(cookieName(userType), { path: "/" });
}

function requireAuth(userType) {
  return (req, res, next) => {
    const token = req.cookies?.[cookieName(userType)];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const payload = verifyToken(token);
    if (!payload || payload.userType !== userType) return res.status(401).json({ error: "Unauthorized" });

    const dbSession = getSession(payload.sessionId);
    if (!dbSession) return res.status(401).json({ error: "Session expired" });

    req.session = payload;
    next();
  };
}

module.exports = { cookieName, signToken, verifyToken, createAuthSession, clearAuthSession, requireAuth };
