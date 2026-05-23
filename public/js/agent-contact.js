/* Agent — Contact Detail
 * Phase 2: adds a "Password reset requested" banner when there are
 * pending password_reset_requests for this contact.
 */

let contactId = null;
let contactData = null;

(async function init() {
  contactId = getParam("id");
  if (!contactId) { window.location.href = "/agent/dashboard"; return; }

  const me = await fetch("/api/agent/me").catch(() => null);
  if (!me || me.status === 401) { window.location.href = "/agent/login"; return; }
  const agentData = await me.json();
  document.getElementById("agentName").textContent      = agentData.name;
  document.getElementById("agentSubdomain").textContent = agentData.subdomain;

  await loadContact();
})();

async function loadContact() {
  const [contactRes, logsRes] = await Promise.all([
    fetch(`/api/agent/contacts/${contactId}`),
    fetch(`/api/agent/logs/${contactId}`),
  ]);

  if (!contactRes.ok) {
    document.getElementById("content").innerHTML =
      `<div class="empty-state"><p class="empty-state-title" style="color:var(--kyc-danger)">Contact not found</p></div>`;
    return;
  }

  contactData = await contactRes.json();
  const logs  = logsRes.ok ? await logsRes.json() : [];
  renderContact(contactData, logs);
}

function pendingResetBanner(pending) {
  if (!pending || !pending.length) return "";
  const latest = pending[0];
  return `
    <div class="pr-banner">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      <div style="flex:1">
        <div><b>Password reset requested.</b> ${pending.length === 1
          ? `This contact submitted a reset request from the sign-in page.`
          : `${pending.length} reset requests pending.`}</div>
        <div class="pr-meta">Most recent: ${escHtml(latest.submitted_email)} · ${formatDateTime(latest.created_at)}</div>
      </div>
      <button onclick="openResetModal()" class="btn-secondary" style="height:32px;padding:0 0.875rem;font-size:0.8125rem;min-height:unset">Reset now</button>
    </div>`;
}

function renderContact(data, logs) {
  const vr = data.verification;

  document.getElementById("content").innerHTML = `
    <div style="animation:fadeIn 0.3s ease">

      ${pendingResetBanner(data.pendingResets)}

      <!-- Header card -->
      <div class="premium-card" style="margin-bottom:1.5rem;padding:1.5rem">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:1rem">
          <div style="display:flex;align-items:center;gap:1rem">
            <div style="width:52px;height:52px;border-radius:14px;background:var(--gradient-btn);display:flex;align-items:center;justify-content:center;font-size:1.25rem;font-weight:700;color:#fff;flex-shrink:0">
              ${escHtml((data.name || data.email).charAt(0).toUpperCase())}
            </div>
            <div>
              <h2 style="font-size:1.125rem;font-weight:700;color:var(--kyc-text);margin:0 0 0.25rem">${escHtml(data.name || "—")}</h2>
              <p style="font-size:0.875rem;color:var(--kyc-muted);margin:0">${escHtml(data.email)}</p>
            </div>
          </div>
          <div style="display:flex;gap:0.625rem;flex-wrap:wrap;align-items:center">
            ${statusBadge(vr?.status || null)}
            <button onclick="openResetModal()" class="btn-secondary" style="padding:0.375rem 0.875rem;font-size:0.8125rem;min-height:unset;height:32px">
              ${icons.key} Reset Password
            </button>
            <button onclick="deleteContact()" class="btn-danger" style="padding:0.375rem 0.875rem;font-size:0.8125rem;min-height:unset;height:32px">
              ${icons.trash} Delete
            </button>
          </div>
        </div>
      </div>

      <!-- KYC status card -->
      <div class="premium-card" style="margin-bottom:1.5rem;padding:1.5rem">
        <h3 style="font-size:0.9375rem;font-weight:600;color:var(--kyc-text);margin:0 0 1rem">KYC Status</h3>
        ${vr ? renderKycStatus(vr) : `<p style="color:var(--kyc-muted);margin:0">No KYC submission yet. The contact has not started the verification process.</p>`}
      </div>

      <!-- Activity log -->
      <div class="premium-card" style="padding:0">
        <div style="padding:1rem 1.25rem;border-bottom:1px solid var(--kyc-border)">
          <h3 style="font-size:0.9375rem;font-weight:600;color:var(--kyc-text);margin:0">Activity Log</h3>
        </div>
        ${renderAuditLog(logs)}
      </div>
    </div>`;
}

function renderKycStatus(vr) {
  const docItems = [
    { label: "Identity & Selfie", done: true, note: "Via Sumsub" },
    { label: "Proof of Address",  done: !!vr.proofOfAddressPath,  note: vr.proofOfAddressPath ? "Uploaded" : "Not uploaded" },
    { label: "Bank Statement",    done: !!vr.bankStatementPath,   note: vr.bankStatementPath  ? "Uploaded" : "Not uploaded" },
    { label: "Agreement",         done: !!vr.agreementPath,       note: vr.agreementPath      ? "Signed & uploaded" : "Not uploaded" },
  ];
  return `
    <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.25rem">
      ${statusBadge(vr.status)}
      <span style="font-size:0.8125rem;color:var(--kyc-muted)">Updated ${formatDate(vr.updatedAt)}</span>
    </div>
    <div style="display:grid;gap:0.625rem">
      ${docItems.map(item => `
        <div style="display:flex;align-items:center;gap:0.75rem;padding:0.625rem 0.875rem;border-radius:10px;background:${item.done ? "var(--kyc-success-light)" : "var(--kyc-bg)"}">
          <div style="width:20px;height:20px;border-radius:50%;background:${item.done ? "var(--kyc-success)" : "var(--kyc-border-dark)"};display:flex;align-items:center;justify-content:center;flex-shrink:0">
            ${item.done ? `<svg width="10" height="10" fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>` : `<svg width="10" height="10" fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`}
          </div>
          <div>
            <span style="font-size:0.875rem;font-weight:500;color:var(--kyc-text)">${escHtml(item.label)}</span>
            <span style="font-size:0.75rem;color:var(--kyc-muted);margin-left:0.5rem">${escHtml(item.note)}</span>
          </div>
        </div>`).join("")}
    </div>`;
}

function renderAuditLog(logs) {
  if (!logs.length) {
    return `<div style="padding:2rem;text-align:center;color:var(--kyc-muted)">No activity recorded</div>`;
  }
  return `<div style="padding:0.5rem 0">
    ${logs.map(l => `
      <div style="display:flex;align-items:flex-start;gap:0.875rem;padding:0.75rem 1.25rem;border-bottom:1px solid var(--kyc-border)">
        <div style="width:8px;height:8px;border-radius:50%;background:var(--kyc-primary-light);margin-top:5px;flex-shrink:0"></div>
        <div style="min-width:0;flex:1">
          <p style="font-size:0.875rem;color:var(--kyc-text);margin:0 0 2px">${escHtml(l.action || l.event || "—")}</p>
          ${l.details ? `<p style="font-size:0.8125rem;color:var(--kyc-muted);margin:0">${escHtml(l.details)}</p>` : ""}
        </div>
        <span style="font-size:0.75rem;color:var(--kyc-muted-2);white-space:nowrap;flex-shrink:0">${formatDateTime(l.created_at)}</span>
      </div>`).join("")}
  </div>`;
}

async function deleteContact() {
  const label = contactData.name || contactData.email;
  if (!confirm(`Permanently delete "${label}"? This cannot be undone.`)) return;
  const res = await fetch(`/api/agent/contacts/${contactId}`, { method: "DELETE" });
  if (res.ok) window.location.href = "/agent/dashboard";
  else alert("Failed to delete contact.");
}

// ── Reset Password Modal ───────────────────────────────────────────────────────
function openResetModal() {
  document.getElementById("newPass").value = "";
  clearError("resetError");
  document.getElementById("resetModal").classList.remove("hidden");
}
function closeResetModal() { document.getElementById("resetModal").classList.add("hidden"); }

async function confirmReset() {
  const password = document.getElementById("newPass").value;
  if (!password || password.length < 6) { showError("resetError", "Password must be at least 6 characters."); return; }

  const btn = document.getElementById("resetConfirmBtn");
  setButtonLoading(btn, true, "Updating...");
  clearError("resetError");

  try {
    const res  = await fetch(`/api/agent/contacts/${contactId}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    setButtonLoading(btn, false);
    if (!res.ok) { showError("resetError", data.error || "Failed to reset password."); return; }
    closeResetModal();
    await loadContact();
  } catch {
    setButtonLoading(btn, false);
    showError("resetError", "Network error. Please try again.");
  }
}
