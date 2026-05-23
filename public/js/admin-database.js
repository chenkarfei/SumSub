/* Admin — Database */

(async function init() {
  const me = await fetch("/api/admin/me").catch(() => null);
  if (!me || me.status === 401) { window.location.href = "/admin/login"; return; }
  const data = await me.json();
  document.getElementById("userName").textContent    = data.name;
  document.getElementById("userInitial").textContent = data.name.charAt(0).toUpperCase();
  await loadDb();
})();

async function loadDb() {
  const res = await fetch("/api/admin/db");
  if (!res.ok) { document.getElementById("content").innerHTML = `<p style="color:var(--kyc-danger);text-align:center">Failed to load database info.</p>`; return; }
  const { tables, stats } = await res.json();
  renderDb(tables, stats);
}

function renderDb(tables, stats) {
  const tableIcons = {
    admins: icons.shield, agents: icons.users, contacts: icons.users,
    verification_records: icons.check, sessions: icons.clock, audit_logs: icons.list,
  };
  const tableColors = {
    admins: ["#EDE9FE","#7C3AED"], agents: ["var(--kyc-primary-subtle)","var(--kyc-primary)"],
    contacts: ["#F0F9FF","#0284C7"], verification_records: ["#ECFDF5","var(--kyc-success)"],
    sessions: ["var(--kyc-warning-light)","var(--kyc-warning)"], audit_logs: ["var(--kyc-bg-2)","var(--kyc-muted)"],
  };

  document.getElementById("content").innerHTML = `
    <div style="animation:fadeIn 0.3s ease">
      <div class="stats-grid" style="margin-bottom:1.5rem">
        ${tables.map(t => {
          const [bg, color] = tableColors[t] || ["var(--kyc-bg-2)","var(--kyc-muted)"];
          const icon = tableIcons[t] || icons.list;
          return `<div class="stat-card" onclick="openTable('${escHtml(t)}')" style="cursor:pointer">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem">
              <span style="font-size:0.8125rem;color:var(--kyc-muted);font-weight:500">${escHtml(t.replace(/_/g," "))}</span>
              <div style="width:32px;height:32px;border-radius:8px;background:${bg};display:flex;align-items:center;justify-content:center;color:${color}">${icon.replace(/width="\d+"/, 'width="18"').replace(/height="\d+"/, 'height="18"')}</div>
            </div>
            <p style="font-size:1.625rem;font-weight:700;color:var(--kyc-text);margin:0">${stats[t] ?? 0}</p>
            <p style="font-size:0.75rem;color:var(--kyc-muted);margin:4px 0 0">records</p>
          </div>`;
        }).join("")}
      </div>

      <div class="premium-card" style="padding:1.5rem">
        <h3 style="font-size:0.9375rem;font-weight:600;color:var(--kyc-text);margin:0 0 1rem">Table Overview</h3>
        <table class="data-table">
          <thead><tr><th>Table</th><th>Records</th></tr></thead>
          <tbody>
            ${tables.map(t => `
              <tr onclick="openTable('${escHtml(t)}')" style="cursor:pointer">
                <td style="font-weight:500"><code style="font-size:0.8125rem;background:var(--kyc-bg-2);padding:2px 6px;border-radius:4px;color:var(--kyc-accent)">${escHtml(t)}</code></td>
                <td style="font-weight:600;color:var(--kyc-text)">${stats[t] ?? 0}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>`;
}

// ── Table viewer ──────────────────────────────────────────────────────────────
let _tableState = { name: null, page: 1 };

function openTable(name) {
  _tableState = { name, page: 1 };
  document.getElementById("tableModalTitle").textContent = name;
  document.getElementById("tableModalBody").innerHTML = '<div style="text-align:center;padding:2rem"><div class="spinner" style="margin:0 auto"></div></div>';
  document.getElementById("tableModalPager").innerHTML = '';
  document.getElementById("tableModal").classList.remove("hidden");
  fetchTablePage(name, 1);
}

function closeTableModal() {
  document.getElementById("tableModal").classList.add("hidden");
}

async function fetchTablePage(name, page) {
  _tableState = { name, page };
  const res  = await fetch(`/api/admin/db/${encodeURIComponent(name)}?page=${page}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    document.getElementById("tableModalBody").innerHTML = `<p style="color:var(--kyc-danger);padding:1rem">${escHtml(data.error || "Failed to load table.")}</p>`;
    return;
  }
  renderTableRows(data);
}

function renderTableRows(data) {
  if (!data.rows.length) {
    document.getElementById("tableModalBody").innerHTML = '<div style="text-align:center;padding:2rem;color:var(--kyc-muted)">No records in this table.</div>';
    document.getElementById("tableModalPager").innerHTML = '';
    return;
  }
  const cols = Object.keys(data.rows[0]);
  document.getElementById("tableModalBody").innerHTML = `
    <div class="data-table-wrapper" style="max-height:52vh;overflow:auto">
      <table class="data-table">
        <thead><tr>${cols.map(c => `<th>${escHtml(c)}</th>`).join("")}</tr></thead>
        <tbody>${data.rows.map(row =>
          `<tr>${cols.map(c => {
            const val = String(row[c] ?? "—");
            return `<td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(val)}">${escHtml(val)}</td>`;
          }).join("")}</tr>`
        ).join("")}</tbody>
      </table>
    </div>`;
  document.getElementById("tableModalPager").innerHTML = data.pages > 1 ? `
    <span style="font-size:0.8125rem;color:var(--kyc-muted)">${data.total} record${data.total!==1?"s":""} · page ${data.page} of ${data.pages}</span>
    <div style="display:flex;gap:0.5rem">
      <button class="btn-secondary" style="height:30px;padding:0 0.75rem;font-size:0.8125rem;min-height:unset" ${data.page<=1?"disabled":""} onclick="fetchTablePage('${escHtml(data.table)}',${data.page-1})">← Prev</button>
      <button class="btn-secondary" style="height:30px;padding:0 0.75rem;font-size:0.8125rem;min-height:unset" ${data.page>=data.pages?"disabled":""} onclick="fetchTablePage('${escHtml(data.table)}',${data.page+1})">Next →</button>
    </div>` : `<span style="font-size:0.8125rem;color:var(--kyc-muted)">${data.total} record${data.total!==1?"s":""}</span><span></span>`;
}
