/* Admin — Contact Detail
 * Phase 2: adds a "Password reset requested" banner when there are
 * pending password_reset_requests for this contact.
 */

let contactId = null;
let agentId   = null;

(async function init() {
  agentId   = getParam("agentId");
  contactId = getParam("contactId");
  if (!contactId) { window.location.href = "/admin/dashboard/agents"; return; }

  const me = await fetch("/api/admin/me").catch(() => null);
  if (!me || me.status === 401) { window.location.href = "/admin/login"; return; }

  if (agentId) {
    const backBtn   = document.getElementById("backBtn");
    const backLabel = document.getElementById("backLabel");
    backBtn.href    = `/admin/dashboard/agent?id=${agentId}`;
    backLabel.textContent = "Agent";
  }

  await loadContact();
})();

async function loadContact() {
  const res = await fetch(`/api/admin/contacts/${contactId}`);
  if (!res.ok) {
    document.getElementById("content").innerHTML =
      `<div class="empty-state"><p class="empty-state-title" style="color:var(--kyc-danger)">Contact not found</p></div>`;
    return;
  }
  const data = await res.json();
  renderContact(data);
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

function renderContact(data) {
  const vr   = data.verification;
  const logs = data.logs || [];

  document.getElementById("content").innerHTML = `
    <div style="animation:fadeIn 0.3s ease">

      ${pendingResetBanner(data.pendingResets)}

      <!-- Contact header card -->
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
            <span class="badge ${data.isActive ? "badge-green" : "badge-slate"}">${data.isActive ? "Active" : "Inactive"}</span>
            <button onclick="openResetModal()" class="btn-secondary" style="height:32px;padding:0 0.875rem;font-size:0.8125rem;min-height:unset">
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Reset Password
            </button>
          </div>
        </div>
        <div style="margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid var(--kyc-border);display:flex;flex-wrap:wrap;gap:1.5rem">
          <div><span style="font-size:0.75rem;color:var(--kyc-muted);display:block;margin-bottom:2px">Created</span><span style="font-size:0.875rem;font-weight:600;color:var(--kyc-text)">${formatDate(data.createdAt)}</span></div>
          <div><span style="font-size:0.75rem;color:var(--kyc-muted);display:block;margin-bottom:2px">Last updated</span><span style="font-size:0.875rem;font-weight:600;color:var(--kyc-text)">${formatDate(data.updatedAt)}</span></div>
        </div>
      </div>

      <!-- Verification details -->
      ${vr ? renderVerification(vr) : `
        <div class="premium-card" style="margin-bottom:1.5rem;padding:1.5rem;text-align:center">
          <p style="color:var(--kyc-muted);margin:0">No KYC submission yet</p>
        </div>`}

      <!-- Audit log -->
      <div class="premium-card" style="padding:0">
        <div style="padding:1rem 1.25rem;border-bottom:1px solid var(--kyc-border)">
          <h3 style="font-size:0.9375rem;font-weight:600;color:var(--kyc-text);margin:0">Activity Log</h3>
        </div>
        ${renderAuditLog(logs)}
      </div>
    </div>`;
}

function renderVerification(vr) {
  const fields = [
    ["First name", vr.first_name], ["Last name", vr.last_name],
    ["Date of birth", vr.date_of_birth], ["Nationality", vr.nationality],
    ["Email", vr.email], ["Phone", vr.phone],
    ["Country of residence", vr.country_of_residence],
    ["Source of funds", vr.source_of_funds], ["Source of wealth", vr.source_of_wealth],
  ];
  const docs = [
    ["Proof of address", vr.proof_of_address_uploaded_at],
    ["Bank statement", vr.bank_statement_uploaded_at],
    ["Agreement", vr.agreement_uploaded_at],
  ];
  return `
    <div class="premium-card" style="margin-bottom:1.5rem;padding:1.5rem">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
        <h3 style="font-size:0.9375rem;font-weight:600;color:var(--kyc-text);margin:0">KYC Submission</h3>
        ${statusBadge(vr.status)}
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem;margin-bottom:1.25rem">
        ${fields.map(([label, val]) => val ? `
          <div>
            <span style="font-size:0.75rem;color:var(--kyc-muted);display:block;margin-bottom:2px">${escHtml(label)}</span>
            <span style="font-size:0.875rem;font-weight:500;color:var(--kyc-text)">${escHtml(val)}</span>
          </div>` : "").join("")}
      </div>
      <div style="border-top:1px solid var(--kyc-border);padding-top:1rem">
        <p style="font-size:0.8125rem;font-weight:600;color:var(--kyc-muted);margin:0 0 0.75rem;text-transform:uppercase;letter-spacing:.05em">Documents</p>
        <div style="display:flex;flex-wrap:wrap;gap:0.75rem">
          ${docs.map(([label, uploadedAt]) => `
            <div style="padding:0.5rem 0.875rem;border-radius:8px;border:1px solid var(--kyc-border);background:var(--kyc-bg)">
              <p style="font-size:0.75rem;color:var(--kyc-muted);margin:0 0 2px">${escHtml(label)}</p>
              <p style="font-size:0.8125rem;font-weight:600;color:${uploadedAt ? "var(--kyc-success)" : "var(--kyc-muted-2)"};margin:0">${uploadedAt ? "Uploaded " + formatDate(uploadedAt) : "Not uploaded"}</p>
            </div>`).join("")}
        </div>
      </div>
    </div>`;
}

// ── Reset password modal ──────────────────────────────────────────────────────
function openResetModal() {
  document.getElementById("newPass").value = "";
  clearError("resetError");
  document.getElementById("resetModal").classList.remove("hidden");
}
function closeResetModal() {
  document.getElementById("resetModal").classList.add("hidden");
}
async function confirmReset() {
  const password = document.getElementById("newPass").value;
  if (!password || password.length < 6) { showError("resetError", "Password must be at least 6 characters."); return; }
  const btn = document.getElementById("resetConfirmBtn");
  setButtonLoading(btn, true, "Resetting...");
  clearError("resetError");
  try {
    const res = await fetch(`/api/admin/contacts/${contactId}/reset-password`, {
      method: "POST", headers: { "Content-Type": "application/json" },
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
