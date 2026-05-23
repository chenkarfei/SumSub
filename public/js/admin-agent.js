/* Admin — Agent Detail
 * Phase 2: adds a "Password reset requested" banner when there are
 * pending password_reset_requests for this agent.
 */

let agentId = null;
let agentData = null;

(async function init() {
  agentId = getParam("id");
  if (!agentId) { window.location.href = "/admin/dashboard/agents"; return; }

  const me = await fetch("/api/admin/me").catch(() => null);
  if (!me || me.status === 401) { window.location.href = "/admin/login"; return; }

  await loadAgent();
})();

async function loadAgent() {
  const res = await fetch(`/api/admin/agents/${agentId}`);
  if (!res.ok) {
    document.getElementById("content").innerHTML =
      `<div class="empty-state"><p class="empty-state-title" style="color:var(--kyc-danger)">Agent not found</p></div>`;
    return;
  }
  agentData = await res.json();
  renderAgent();
}

function pendingResetBanner(pending) {
  if (!pending || !pending.length) return "";
  const latest = pending[0];
  return `
    <div class="pr-banner">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      <div style="flex:1">
        <div><b>Password reset requested.</b> ${pending.length === 1
          ? `This user submitted a reset request from the sign-in page.`
          : `${pending.length} reset requests pending.`}</div>
        <div class="pr-meta">Most recent: ${escHtml(latest.submitted_email)} · ${formatDateTime(latest.created_at)}</div>
      </div>
      <button onclick="openResetModal()" class="btn-secondary" style="height:32px;padding:0 0.875rem;font-size:0.8125rem;min-height:unset">Reset now</button>
    </div>`;
}

function renderAgent() {
  const a = agentData;
  const stats = a.stats || {};

  document.getElementById("content").innerHTML = `
    <div style="animation:fadeIn 0.3s ease">

      ${pendingResetBanner(a.pendingResets)}

      <!-- Agent header card -->
      <div class="premium-card" style="margin-bottom:1.5rem;padding:1.5rem">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:1rem">
          <div style="display:flex;align-items:center;gap:1rem">
            <div style="width:52px;height:52px;border-radius:14px;background:var(--gradient-brand);display:flex;align-items:center;justify-content:center;font-size:1.25rem;font-weight:700;color:#fff;flex-shrink:0">
              ${escHtml(a.name.charAt(0).toUpperCase())}
            </div>
            <div>
              <h2 style="font-size:1.125rem;font-weight:700;color:var(--kyc-text);margin:0 0 0.25rem">${escHtml(a.name)}</h2>
              <p style="font-size:0.875rem;color:var(--kyc-muted);margin:0">${escHtml(a.email)}</p>
            </div>
          </div>
          <div style="display:flex;gap:0.625rem;flex-wrap:wrap;align-items:center">
            <span class="mono-tag">${escHtml(a.subdomain)}</span>
            <span class="badge ${a.isActive ? "badge-green" : "badge-slate"}">${a.isActive ? "Active" : "Inactive"}</span>
            <button onclick="openResetModal()" class="btn-secondary" style="padding:0.375rem 0.875rem;font-size:0.8125rem;min-height:unset;height:32px">
              ${icons.key} Reset Password
            </button>
            <button onclick="deleteAgent()" class="btn-danger" style="padding:0.375rem 0.875rem;font-size:0.8125rem;min-height:unset;height:32px">
              ${icons.trash} Delete Agent
            </button>
          </div>
        </div>
        <div style="margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid var(--kyc-border);display:flex;flex-wrap:wrap;gap:1.5rem">
          <div><span style="font-size:0.75rem;color:var(--kyc-muted);display:block;margin-bottom:2px">Username</span><span style="font-size:0.875rem;font-weight:600;color:var(--kyc-text)">${escHtml(a.username)}</span></div>
          <div><span style="font-size:0.75rem;color:var(--kyc-muted);display:block;margin-bottom:2px">Created</span><span style="font-size:0.875rem;font-weight:600;color:var(--kyc-text)">${formatDate(a.createdAt)}</span></div>
          <div><span style="font-size:0.75rem;color:var(--kyc-muted);display:block;margin-bottom:2px">Last updated</span><span style="font-size:0.875rem;font-weight:600;color:var(--kyc-text)">${formatDate(a.updatedAt)}</span></div>
        </div>
      </div>

      <!-- Stats row -->
      <div class="stats-grid" style="margin-bottom:1.5rem">
        ${statCard("Total", stats.total ?? 0, icons.users, "var(--kyc-primary-subtle)", "var(--kyc-primary)")}
        ${statCard("Verified", stats.verified ?? 0, icons.check, "#ECFDF5", "var(--kyc-success)")}
        ${statCard("Pending", stats.pending ?? 0, icons.clock, "#F0F9FF", "#0284C7")}
        ${statCard("Failed", stats.failed ?? 0, icons.x, "var(--kyc-danger-light)", "var(--kyc-danger)")}
      </div>

      <!-- Contacts table -->
      <div class="data-table-wrapper">
        <div style="padding:1rem 1.25rem;border-bottom:1px solid var(--kyc-border);display:flex;align-items:center;justify-content:space-between">
          <h3 style="font-size:0.9375rem;font-weight:600;color:var(--kyc-text);margin:0">Contacts</h3>
          <span style="font-size:0.8125rem;color:var(--kyc-muted)">${a.contacts.length} total</span>
        </div>
        ${renderContactsTable(a.contacts)}
      </div>
    </div>`;
}

function statCard(label, value, icon, bg, color) {
  return `<div class="stat-card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem">
      <span style="font-size:0.8125rem;color:var(--kyc-muted);font-weight:500">${label}</span>
      <div style="width:32px;height:32px;border-radius:8px;background:${bg};display:flex;align-items:center;justify-content:center;color:${color}">${icon.replace(/width="\d+"/, 'width="18"').replace(/height="\d+"/, 'height="18"')}</div>
    </div>
    <p style="font-size:1.625rem;font-weight:700;color:var(--kyc-text);margin:0">${value}</p>
  </div>`;
}

function renderContactsTable(contacts) {
  if (!contacts || contacts.length === 0) {
    return `<div class="empty-state" style="padding:3rem"><div class="empty-state-icon">${icons.users}</div><p class="empty-state-title">No contacts yet</p><p class="empty-state-text">This agent has no contacts.</p></div>`;
  }
  return `<table class="data-table">
    <thead><tr>
      <th>Contact</th>
      <th>Status</th>
      <th class="hide-lg">Last Activity</th>
      <th class="hide-lg">Active</th>
    </tr></thead>
    <tbody>
      ${contacts.map(c => `
        <tr style="cursor:pointer" onclick="window.location.href='/admin/dashboard/contact?agentId=${escHtml(agentId)}&contactId=${escHtml(c.id)}'">
          <td>
            <p style="font-weight:600;color:var(--kyc-dark-2);margin:0">${escHtml(c.name)}</p>
            <p style="font-size:0.75rem;color:var(--kyc-muted);margin:0">${escHtml(c.email)}</p>
          </td>
          <td>${statusBadge(c.status)}</td>
          <td class="hide-lg" style="color:var(--kyc-muted)">${formatDate(c.updatedAt)}</td>
          <td class="hide-lg" onclick="event.stopPropagation()">
            <label class="toggle">
              <input type="checkbox" class="toggle-input" ${c.isActive ? "checked" : ""} onchange="toggleContact('${escHtml(c.id)}', this.checked)" />
              <div class="toggle-track"></div>
              <div class="toggle-thumb"></div>
            </label>
          </td>
        </tr>`).join("")}
    </tbody>
  </table>`;
}

async function toggleContact(contactId, isActive) {
  await fetch(`/api/admin/contacts/${contactId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive }),
  });
}

async function deleteAgent() {
  if (!confirm(`Permanently delete "${agentData.name}" and all their contacts? This cannot be undone.`)) return;
  const res = await fetch(`/api/admin/agents/${agentId}`, { method: "DELETE" });
  if (res.ok) window.location.href = "/admin/dashboard/agents";
  else alert("Failed to delete agent.");
}

// ── Reset Password Modal ───────────────────────────────────────────────────────
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
  setButtonLoading(btn, true, "Updating...");
  clearError("resetError");

  const res = await fetch(`/api/admin/agents/${agentId}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const data = await res.json();
  setButtonLoading(btn, false);
  if (!res.ok) { showError("resetError", data.error || "Failed to reset password."); return; }
  closeResetModal();
  // Refresh to clear the pending-reset banner if it was showing.
  await loadAgent();
}
