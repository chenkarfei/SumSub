/* Agent Dashboard — Contacts Management */

let allContacts = [];
let selected    = new Set();
let activeFilter = null;
let searchTimer  = null;

const FILTERS = [
  { label: "All",        value: null },
  { label: "Verified",   value: "GREEN" },
  { label: "Processing", value: "processing" },
  { label: "Pending",    value: "pending" },
  { label: "Failed",     value: "RED" },
];


(async function init() {
  const searchInput = document.getElementById("searchInput");
  searchInput.value = "";
  searchInput.addEventListener("focus", () => searchInput.removeAttribute("readonly"));
  searchInput.addEventListener("blur",  () => { if (!searchInput.value) searchInput.setAttribute("readonly", ""); });
  searchInput.addEventListener("input", onSearch);

  const me = await fetch("/api/agent/me").catch(() => null);
  if (!me || me.status === 401) { window.location.href = "/agent/login"; return; }
  const data = await me.json();
  document.getElementById("agentName").textContent      = data.name;
  document.getElementById("agentSubdomain").textContent = data.subdomain;
  renderFilterPills();
  await loadContacts();
})();

async function loadContacts() {
  const search = document.getElementById("searchInput").value.trim();
  const params = new URLSearchParams();
  if (search)       params.set("search", search);
  if (activeFilter) params.set("filter", activeFilter);

  const res = await fetch(`/api/agent/contacts?${params}`);
  if (!res.ok) { renderError("Failed to load contacts."); return; }
  const { contacts, stats } = await res.json();
  allContacts = contacts;
  const validIds = new Set(contacts.map(c => c.id));
  for (const id of [...selected]) { if (!validIds.has(id)) selected.delete(id); }
  renderStats(stats || {});
  renderTable();
}

const statIcons = {
  users: `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  check: `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  clock: `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  x:     `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
};

function renderStats(stats) {
  const cards = [
    { label: "Total",    value: stats.total    ?? 0, icon: statIcons.users, bg: "var(--kyc-primary-subtle)", color: "var(--kyc-primary)" },
    { label: "Verified", value: stats.verified ?? 0, icon: statIcons.check, bg: "#ECFDF5",                   color: "var(--kyc-success)" },
    { label: "Pending",  value: stats.pending  ?? 0, icon: statIcons.clock, bg: "#F0F9FF",                   color: "#0284C7" },
    { label: "Failed",   value: stats.failed   ?? 0, icon: statIcons.x,     bg: "var(--kyc-danger-light)",   color: "var(--kyc-danger)" },
  ];
  document.getElementById("statsGrid").innerHTML = cards.map(c =>
    `<div class="stat-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem">
        <span style="font-size:0.8125rem;color:var(--kyc-muted);font-weight:500">${c.label}</span>
        <div style="width:32px;height:32px;border-radius:8px;background:${c.bg};display:flex;align-items:center;justify-content:center;color:${c.color}">${c.icon}</div>
      </div>
      <p style="font-size:1.625rem;font-weight:700;color:var(--kyc-text);margin:0">${c.value}</p>
    </div>`
  ).join("");
}

function renderFilterPills() {
  document.getElementById("filterPills").innerHTML = FILTERS.map(f =>
    `<button class="filter-pill ${activeFilter === f.value ? "active" : ""}" onclick="setFilter(${JSON.stringify(f.value)})">${escHtml(f.label)}</button>`
  ).join("");
}

function setFilter(value) {
  activeFilter = value;
  renderFilterPills();
  loadContacts();
}

function onSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadContacts, 300);
}

function renderTable() {
  const tbody = document.getElementById("contactsTableBody");
  if (allContacts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon">${icons.users}</div><p class="empty-state-title">No contacts yet</p><p class="empty-state-text">Create your first contact to get started.</p></div></td></tr>`;
    const allChk = document.getElementById("selectAll");
    allChk.checked = false;
    allChk.indeterminate = false;
    updateBulkBar();
    return;
  }

  tbody.innerHTML = allContacts.map(c => `
    <tr class="${selected.has(c.id) ? "selected" : ""}" onclick="rowClick(event,'${escHtml(c.id)}')">
      <td onclick="event.stopPropagation()">
        <input type="checkbox" class="checkbox" ${selected.has(c.id)?"checked":""} onchange="toggleSelect('${escHtml(c.id)}',this.checked)" />
      </td>
      <td>
        <p style="font-weight:600;color:var(--kyc-dark-2);margin:0">${escHtml(c.name || "—")}</p>
        <p style="font-size:0.75rem;color:var(--kyc-muted);margin:0">${escHtml(c.email)}</p>
      </td>
      <td class="hide-md">${statusBadge(c.status)}</td>
      <td class="hide-lg" style="color:var(--kyc-muted)">${formatDate(c.updatedAt)}</td>
      <td class="hide-lg" onclick="event.stopPropagation()">
        <label class="toggle">
          <input type="checkbox" class="toggle-input" ${c.isActive?"checked":""} onchange="toggleStatus('${escHtml(c.id)}',this.checked)" />
          <div class="toggle-track"></div>
          <div class="toggle-thumb"></div>
        </label>
      </td>
    </tr>`).join("");

  const allChk = document.getElementById("selectAll");
  allChk.checked       = selected.size === allContacts.length && allContacts.length > 0;
  allChk.indeterminate = selected.size > 0 && selected.size < allContacts.length;
  updateBulkBar();
}

function rowClick(e, id) {
  window.location.href = `/agent/dashboard/contact?id=${id}`;
}

function toggleSelect(id, checked) {
  checked ? selected.add(id) : selected.delete(id);
  renderTable();
}

document.getElementById("selectAll").addEventListener("change", function() {
  if (this.checked) allContacts.forEach(c => selected.add(c.id));
  else selected.clear();
  renderTable();
});

function updateBulkBar() {
  const bar = document.getElementById("bulkBar");
  const cnt = document.getElementById("bulkCount");
  if (selected.size > 0) {
    bar.classList.remove("hidden");
    cnt.textContent = `${selected.size} contact${selected.size!==1?"s":""} selected`;
  } else {
    bar.classList.add("hidden");
  }
}

async function toggleStatus(id, isActive) {
  await fetch(`/api/agent/contacts/${id}`, {
    method: "PUT", headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ isActive }),
  });
}

function renderError(msg) {
  document.getElementById("contactsTableBody").innerHTML =
    `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--kyc-danger)">${escHtml(msg)}</td></tr>`;
}

// ── Create modal ──────────────────────────────────────────────────────────────
function openCreateModal() {
  document.getElementById("createModal").classList.remove("hidden");
  ["newName","newEmail","newPassword"].forEach(id => { document.getElementById(id).value = ""; });
  clearError("createError");
}
function closeCreateModal() { document.getElementById("createModal").classList.add("hidden"); }

async function submitCreateContact() {
  const name     = document.getElementById("newName").value.trim();
  const email    = document.getElementById("newEmail").value.trim();
  const password = document.getElementById("newPassword").value;

  if (!email || !password) { showError("createError", "Email and password are required."); return; }
  if (password.length < 6) { showError("createError", "Password must be at least 6 characters."); return; }

  const btn = document.getElementById("createConfirmBtn");
  setButtonLoading(btn, true, "Creating...");
  clearError("createError");

  const res  = await fetch("/api/agent/contacts", {
    method: "POST", headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ name, email, password }),
  });
  const data = await res.json();
  setButtonLoading(btn, false);
  if (!res.ok) { showError("createError", data.error || "Failed to create contact."); return; }
  closeCreateModal();
  await loadContacts();
}

// ── Bulk delete modal ─────────────────────────────────────────────────────────
function openBulkDeleteModal() {
  const contacts = allContacts.filter(c => selected.has(c.id));
  document.getElementById("bulkDeleteTitle").textContent = `Remove ${contacts.length} Contact${contacts.length!==1?"s":""}`;
  document.getElementById("bulkDeleteList").innerHTML = contacts.map(c =>
    `<li style="font-size:0.875rem;color:#fff;font-weight:500;margin-bottom:4px">${escHtml(c.name || c.email)} <span style="color:rgba(255,255,255,0.4);font-weight:400">(${escHtml(c.email)})</span></li>`
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

  const res  = await fetch("/api/agent/contacts/bulk-delete", {
    method: "POST", headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ ids }),
  });
  const data = await res.json();
  setButtonLoading(btn, false);
  if (!res.ok) { document.getElementById("bulkDeleteError").textContent = data.error || "Failed."; document.getElementById("bulkDeleteError").classList.remove("hidden"); return; }
  closeBulkDeleteModal();
  selected.clear();
  await loadContacts();
}
