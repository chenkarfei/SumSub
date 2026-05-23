/* Admin Dashboard — Agents Management */

let allAgents = [];
let selected  = new Set();

(async function init() {
  const me = await loadAdminMe();
  if (!me) return;
  document.getElementById("userName").textContent = me.name;
  document.getElementById("userInitial").textContent = me.name.charAt(0).toUpperCase();
  await loadAgents();
})();

async function loadAdminMe() {
  const res = await fetch("/api/admin/me").catch(() => null);
  if (!res || res.status === 401) { window.location.href = "/admin/login"; return null; }
  return res.json();
}

async function loadAgents() {
  const res = await fetch("/api/admin/agents");
  if (!res.ok) { renderError("Failed to load agents."); return; }
  allAgents = await res.json();
  const validIds = new Set(allAgents.map(a => a.id));
  for (const id of [...selected]) { if (!validIds.has(id)) selected.delete(id); }
  renderTable();
}

function renderTable() {
  const tbody = document.getElementById("agentsTableBody");
  if (allAgents.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon">${icons.users}</div><p class="empty-state-title">No agents yet</p><p class="empty-state-text">Create your first agent to get started.</p></div></td></tr>`;
    const allChk = document.getElementById("selectAll");
    allChk.checked = false;
    allChk.indeterminate = false;
    updateBulkBar();
    return;
  }

  tbody.innerHTML = allAgents.map(a => `
    <tr class="${selected.has(a.id) ? "selected" : ""}" onclick="rowClick(event,'${escHtml(a.id)}')">
      <td onclick="event.stopPropagation()">
        <input type="checkbox" class="checkbox" ${selected.has(a.id)?"checked":""} onchange="toggleSelect('${escHtml(a.id)}',this.checked)" />
      </td>
      <td>
        <p style="font-weight:600;color:var(--kyc-dark-2);margin:0">${escHtml(a.name)}</p>
        <p style="font-size:0.75rem;color:var(--kyc-muted);margin:0">${escHtml(a.email)}</p>
      </td>
      <td class="hide-md"><span class="mono-tag">${escHtml(a.subdomain)}</span></td>
      <td class="hide-lg" style="color:var(--kyc-muted)">${a.total ?? 0} total &middot; ${a.verified ?? 0} verified</td>
      <td class="hide-lg" onclick="event.stopPropagation()">
        <label class="toggle">
          <input type="checkbox" class="toggle-input" ${a.isActive?"checked":""} onchange="toggleStatus('${escHtml(a.id)}',this.checked)" />
          <div class="toggle-track"></div>
          <div class="toggle-thumb"></div>
        </label>
      </td>
    </tr>`).join("");

  // Select all checkbox state
  const allChk = document.getElementById("selectAll");
  allChk.checked       = selected.size === allAgents.length && allAgents.length > 0;
  allChk.indeterminate = selected.size > 0 && selected.size < allAgents.length;
  updateBulkBar();
}

function rowClick(e, id) {
  window.location.href = `/admin/dashboard/agent?id=${id}`;
}

function toggleSelect(id, checked) {
  checked ? selected.add(id) : selected.delete(id);
  renderTable();
}

document.getElementById("selectAll").addEventListener("change", function() {
  if (this.checked) allAgents.forEach(a => selected.add(a.id));
  else selected.clear();
  renderTable();
});

function updateBulkBar() {
  const bar = document.getElementById("bulkBar");
  const cnt = document.getElementById("bulkCount");
  if (selected.size > 0) {
    bar.classList.remove("hidden");
    cnt.textContent = `${selected.size} agent${selected.size!==1?"s":""} selected`;
  } else {
    bar.classList.add("hidden");
  }
}

async function toggleStatus(id, isActive) {
  await fetch(`/api/admin/agents/${id}`, {
    method: "PUT", headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ isActive }),
  });
}

function renderError(msg) {
  document.getElementById("agentsTableBody").innerHTML =
    `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--kyc-danger)">${escHtml(msg)}</td></tr>`;
}

// ── Create modal ──────────────────────────────────────────────────────────────
function openCreateModal() {
  document.getElementById("createModal").classList.remove("hidden");
  ["newName","newEmail","newSubdomain","newUsername","newPassword"].forEach(id => { document.getElementById(id).value = ""; });
  clearError("createError");
}

function closeCreateModal() { document.getElementById("createModal").classList.add("hidden"); }

async function submitCreateAgent() {
  const name      = document.getElementById("newName").value.trim();
  const email     = document.getElementById("newEmail").value.trim();
  const subdomain = document.getElementById("newSubdomain").value.trim();
  const username  = document.getElementById("newUsername").value.trim();
  const password  = document.getElementById("newPassword").value;

  if (!name || !email || !subdomain || !username || !password) {
    showError("createError", "All fields are required."); return;
  }

  const btn = document.getElementById("createConfirmBtn");
  setButtonLoading(btn, true, "Creating...");
  clearError("createError");

  const res = await fetch("/api/admin/agents", {
    method: "POST", headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ name, email, subdomain, username, password }),
  });
  const data = await res.json();
  setButtonLoading(btn, false);
  if (!res.ok) { showError("createError", data.error || "Failed to create agent."); return; }

  closeCreateModal();
  await loadAgents();
}

// ── Bulk delete modal ─────────────────────────────────────────────────────────
function openBulkDeleteModal() {
  const agents = allAgents.filter(a => selected.has(a.id));
  document.getElementById("bulkDeleteTitle").textContent = `Remove ${agents.length} Agent${agents.length!==1?"s":""}`;
  document.getElementById("bulkDeleteList").innerHTML = agents.map(a =>
    `<li style="font-size:0.875rem;color:#fff;font-weight:500;margin-bottom:4px">${escHtml(a.name)} <span style="color:rgba(255,255,255,0.4);font-weight:400">(${escHtml(a.email)})</span></li>`
  ).join("");
  document.getElementById("bulkDeleteError").classList.add("hidden");
  document.getElementById("bulkDeleteModal").classList.remove("hidden");
}

function closeBulkDeleteModal() { document.getElementById("bulkDeleteModal").classList.add("hidden"); }

async function confirmBulkDelete() {
  const ids = [...selected];
  const btn = document.getElementById("bulkDeleteConfirmBtn");
  setButtonLoading(btn, true, "Removing...");
  document.getElementById("bulkDeleteError").classList.add("hidden");

  const res = await fetch("/api/admin/agents/bulk-delete", {
    method: "POST", headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ ids }),
  });
  const data = await res.json();
  setButtonLoading(btn, false);
  if (!res.ok) { document.getElementById("bulkDeleteError").textContent = data.error || "Failed."; document.getElementById("bulkDeleteError").classList.remove("hidden"); return; }

  closeBulkDeleteModal();
  selected.clear();
  await loadAgents();
}
