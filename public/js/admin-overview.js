/* Admin — Overview Dashboard */

(async function init() {
  const me = await fetch("/api/admin/me").catch(() => null);
  if (!me || me.status === 401) { window.location.href = "/admin/login"; return; }
  const meData = await me.json();
  document.getElementById("userName").textContent    = meData.name;
  document.getElementById("userInitial").textContent = meData.name.charAt(0).toUpperCase();

  const res = await fetch("/api/admin/overview");
  if (!res.ok) {
    document.getElementById("content").innerHTML =
      `<p style="text-align:center;color:var(--kyc-danger);padding:3rem">Failed to load overview data.</p>`;
    return;
  }
  const data = await res.json();
  render(data);
})();

// ── Main render ───────────────────────────────────────────────────────────────

function render(d) {
  document.getElementById("content").innerHTML = `
    <div style="animation:fadeIn 0.3s ease">
      ${renderHero(d.passRate)}
      ${renderChips(d.today)}
      <div class="ov-section-grid">
        ${renderFunnelCard(d.funnel)}
        ${renderDonutCard(d.statusBreakdown)}
        ${renderTopAgentsCard(d.topAgents)}
      </div>
      <div class="ov-bottom-grid">
        ${renderActivityCard(d.recentActivity)}
        ${renderTablesCard(d.tables)}
      </div>
    </div>`;
}

// ── Hero pass-rate card ───────────────────────────────────────────────────────

function renderHero(p) {
  const delta    = p.delta ?? 0;
  const deltaCls = delta > 0 ? "pos" : delta < 0 ? "neg" : "neu";
  const deltaLbl = delta > 0 ? `+${delta}%` : delta < 0 ? `${delta}%` : "—";
  const deltaVs  = delta !== 0 ? " vs previous 30 days" : " vs previous 30 days";
  return `
    <div class="ov-hero">
      <div class="ov-hero-label">KYC Pass Rate &mdash; Last 30 Days</div>
      <div class="ov-hero-rate">${p.rate}%</div>
      <div class="ov-hero-sub">
        ${p.count} of ${p.total} submissions verified
        <span class="ov-hero-delta ${deltaCls}">${deltaLbl}</span>
        <span style="color:rgba(255,255,255,0.4);font-size:0.8125rem">${deltaVs}</span>
      </div>
    </div>`;
}

// ── Today stat chips ──────────────────────────────────────────────────────────

function renderChips(t) {
  const chips = [
    { label: "Today",          value: t.submitted,    cls: ""        },
    { label: "In Review",      value: t.inReview,     cls: t.inReview  > 0 ? "warn"    : "" },
    { label: "Failed",         value: t.failed,       cls: t.failed    > 0 ? "danger"  : "" },
    { label: "Active Agents",  value: t.activeAgents, cls: "success"  },
    { label: "Pending Resets", value: t.pendingResets,cls: t.pendingResets > 0 ? "warn" : "" },
  ];
  return `<div class="ov-chips">${chips.map(c => `
    <div class="ov-chip">
      <div class="ov-chip-label">${escHtml(c.label)}</div>
      <div class="ov-chip-value ${c.cls}">${c.value}</div>
    </div>`).join("")}</div>`;
}

// ── Verification funnel ───────────────────────────────────────────────────────

function renderFunnelCard(f) {
  const steps = [
    { label: "Contacts invited", count: f.invited,    cls: "c1" },
    { label: "Registered",       count: f.registered, cls: "c2" },
    { label: "Submitted",        count: f.submitted,  cls: "c3" },
    { label: "Verified",         count: f.verified,   cls: "c4" },
  ];
  const max = steps[0].count || 1;
  const bars = steps.map((s, i) => {
    const pct   = Math.round((s.count / max) * 100);
    const next  = steps[i + 1];
    const fwd   = next && s.count > 0 ? Math.round((next.count / s.count) * 100) : null;
    const META  = ["created an account", "submitted KYC docs", "verified"];
    const meta  = (i < steps.length - 1 && fwd !== null) ? `↳ ${fwd}% ${META[i]}` : "";
    return `
      <div class="ov-funnel-step">
        <div class="ov-funnel-bar-wrap">
          <div class="ov-funnel-bar ${s.cls}" style="width:${pct}%">${s.count} ${escHtml(s.label)}</div>
        </div>
        ${meta ? `<div class="ov-funnel-meta">${escHtml(meta)}</div>` : ""}
      </div>`;
  }).join("");
  return `
    <div class="ov-card">
      <div class="ov-card-head">
        <span class="ov-card-title">Verification funnel</span>
        <span class="ov-card-sub">Last 30 days</span>
      </div>
      <div class="ov-card-body">
        <div class="ov-funnel">${bars}</div>
      </div>
    </div>`;
}

// ── Status donut chart ────────────────────────────────────────────────────────

const DONUT_COLORS = {
  GREEN:      "#059669",
  RED:        "#DC2626",
  RETRY:      "#D97706",
  processing: "#3B82F6",
  pending:    "#6366F1",
};
const DONUT_LABELS = {
  GREEN: "Verified", RED: "Failed", RETRY: "Retry",
  processing: "Processing", pending: "Pending",
};

function renderDonutCard(breakdown) {
  const total = breakdown.reduce((s, r) => s + r.count, 0) || 1;
  const R = 45, CX = 60, CY = 60;
  const circ = 2 * Math.PI * R;

  let offset = 0;
  const segments = breakdown.map(r => {
    const frac  = r.count / total;
    const dash  = frac * circ;
    const gap   = circ - dash;
    const seg   = `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none"
      stroke="${DONUT_COLORS[r.status] || "#94A3B8"}"
      stroke-width="18"
      stroke-dasharray="${dash.toFixed(2)} ${gap.toFixed(2)}"
      stroke-dashoffset="${(-offset * circ / (2 * Math.PI * R) * circ + circ / 4).toFixed(2)}"
      transform="rotate(${offset * 360 / 1 - 90}, ${CX}, ${CY})"
      style="transform-origin:${CX}px ${CY}px;transform:rotate(${(offset / 1) * 360 - 90}deg)"
    />`;
    offset += frac;
    return seg;
  });

  // Simpler approach: compute start angles
  let startAngle = -90;
  const arcs = breakdown.map(r => {
    const frac  = r.count / total;
    const sweep = frac * 360;
    const sa    = startAngle;
    const ea    = startAngle + sweep;
    startAngle  = ea;
    const x1 = CX + R * Math.cos((sa * Math.PI) / 180);
    const y1 = CY + R * Math.sin((sa * Math.PI) / 180);
    const x2 = CX + R * Math.cos((ea * Math.PI) / 180);
    const y2 = CY + R * Math.sin((ea * Math.PI) / 180);
    const lg  = sweep > 180 ? 1 : 0;
    return `<path d="M ${CX} ${CY} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${lg} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z"
      fill="${DONUT_COLORS[r.status] || "#94A3B8"}" />`;
  });

  const legend = breakdown.map(r => `
    <div class="ov-legend-row">
      <div class="ov-legend-left">
        <div class="ov-legend-dot" style="background:${DONUT_COLORS[r.status] || "#94A3B8"}"></div>
        <span class="ov-legend-label">${escHtml(DONUT_LABELS[r.status] || r.status)}</span>
      </div>
      <span class="ov-legend-count">${r.count}</span>
    </div>`).join("");

  return `
    <div class="ov-card">
      <div class="ov-card-head">
        <span class="ov-card-title">Status breakdown</span>
        <span class="ov-card-sub">All time</span>
      </div>
      <div class="ov-card-body">
        <div class="ov-donut-wrap">
          <svg class="ov-donut-svg" width="120" height="120" viewBox="0 0 120 120">
            <circle cx="${CX}" cy="${CY}" r="${R}" fill="#f1f5f9"/>
            ${breakdown.length ? arcs.join("") : ""}
            <circle cx="${CX}" cy="${CY}" r="${R - 12}" fill="#fff"/>
            <text x="${CX}" y="${CY}" text-anchor="middle" dominant-baseline="middle"
              style="font-size:1.25rem;font-weight:800;fill:#0f172a">${total}</text>
            <text x="${CX}" y="${CY + 14}" text-anchor="middle"
              style="font-size:0.5rem;fill:#64748b;font-weight:600;letter-spacing:.05em;text-transform:uppercase">submissions</text>
          </svg>
          <div class="ov-donut-legend">${breakdown.length ? legend : `<p style="color:var(--kyc-muted);text-align:center;font-size:0.875rem">No data yet</p>`}</div>
        </div>
      </div>
    </div>`;
}

// ── Top agents ────────────────────────────────────────────────────────────────

function renderTopAgentsCard(agents) {
  const maxCnt = agents[0]?.cnt || 1;
  const rows = agents.map((a, i) => `
    <div class="ov-agent-row">
      <div class="ov-agent-meta">
        <div style="display:flex;align-items:center">
          <span class="ov-agent-rank">${i + 1}</span>
          <div>
            <div class="ov-agent-name">${escHtml(a.name)}</div>
            <div class="ov-agent-sub">${escHtml(a.subdomain)}</div>
          </div>
        </div>
        <span class="ov-agent-cnt">${a.cnt}</span>
      </div>
      <div class="ov-agent-bar-track">
        <div class="ov-agent-bar-fill" style="width:${Math.round((a.cnt / maxCnt) * 100)}%"></div>
      </div>
    </div>`).join("");

  return `
    <div class="ov-card">
      <div class="ov-card-head">
        <span class="ov-card-title">Top agents</span>
        <span class="ov-card-sub">By contact count</span>
      </div>
      <div class="ov-card-body">
        <div class="ov-agents">
          ${agents.length ? rows : `<p style="color:var(--kyc-muted);text-align:center;font-size:0.875rem;padding:1rem 0">No agents yet</p>`}
        </div>
      </div>
    </div>`;
}

// ── Recent activity ───────────────────────────────────────────────────────────

const ACTIVITY_MAP = {
  "agent.created":                { label: a => `Agent created`,               dot: "var(--kyc-primary)",  meta: a => a.agent_name || a.event_data?.name || "" },
  "agent.deleted":                { label: a => `Agent deleted`,               dot: "var(--kyc-danger)",   meta: a => a.event_data?.name || "" },
  "agent.login":                  { label: a => `Agent signed in`,             dot: "var(--kyc-success)",  meta: a => a.agent_name || a.event_data?.username || "" },
  "agent.password.changed":       { label: a => `Agent password changed`,      dot: "#7C3AED",             meta: a => a.agent_name || "" },
  "contact.created":              { label: a => `Contact created`,             dot: "var(--kyc-primary)",  meta: a => [a.contact_email || a.event_data?.email, a.agent_subdomain].filter(Boolean).join(" · ") },
  "contact.deleted":              { label: a => `Contact deleted`,             dot: "var(--kyc-danger)",   meta: a => a.event_data?.email || "" },
  "contact.login":                { label: a => `Contact signed in`,           dot: "var(--kyc-success)",  meta: a => [a.contact_email || a.event_data?.email, a.agent_subdomain].filter(Boolean).join(" · ") },
  "verification.status.changed":  { label: a => `Verification ${fmtStatus(a.event_data?.status)}`, dot: statusDot(null), meta: a => [a.contact_name || "anonymous", a.event_data?.status, a.event_data?.reason].filter(Boolean).join(" · ") },
  "admin.password.changed":       { label: a => `Admin password changed`,      dot: "#7C3AED",             meta: a => a.event_data?.username || "" },
  "admin.login":                  { label: a => `Admin signed in`,             dot: "var(--kyc-success)",  meta: a => a.event_data?.username || "" },
};

function fmtStatus(s) {
  const m = { GREEN: "approved", RED: "failed", RETRY: "queued for retry", processing: "processing", pending: "pending" };
  return m[s] || s || "";
}
function statusDot(a) {
  if (!a) return "var(--kyc-muted)";
  const s = a.event_data?.status;
  const m = { GREEN: "var(--kyc-success)", RED: "var(--kyc-danger)", RETRY: "var(--kyc-warning)", processing: "var(--kyc-primary)", pending: "#7C3AED" };
  return m[s] || "var(--kyc-muted)";
}

function renderActivityCard(activity) {
  const items = activity.map(a => {
    const cfg   = ACTIVITY_MAP[a.event_type] || { label: () => a.event_type, dot: "var(--kyc-muted)", meta: () => "" };
    const dot   = a.event_type === "verification.status.changed" ? statusDot(a) : cfg.dot;
    const label = cfg.label(a);
    const meta  = cfg.meta(a);
    return `
      <div class="log-item">
        <div class="log-dot" style="background:${dot};margin-top:4px"></div>
        <div style="flex:1;min-width:0">
          <div class="log-event">${escHtml(label)}</div>
          ${meta ? `<div class="log-meta">${escHtml(meta)}</div>` : ""}
        </div>
        <span style="font-size:0.75rem;color:var(--kyc-muted-2);white-space:nowrap;flex-shrink:0">${timeAgo(a.created_at)}</span>
      </div>`;
  }).join("");

  return `
    <div class="ov-card">
      <div class="ov-card-head">
        <span class="ov-card-title">Recent activity</span>
        <span class="ov-card-sub">Last 24 hours</span>
      </div>
      <div class="ov-activity activity-log">
        ${activity.length ? items : `<p style="color:var(--kyc-muted);text-align:center;font-size:0.875rem;padding:2rem">No activity in the last 24 hours</p>`}
      </div>
    </div>`;
}

function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return formatDate(iso);
}

// ── Browse raw tables ─────────────────────────────────────────────────────────

function renderTablesCard(t) {
  const rows = t.names.map(name => {
    const today = t.today[name] ?? 0;
    return `
      <div class="ov-table-row" onclick="openTable('${escHtml(name)}')">
        <span class="ov-table-name">${escHtml(name)}</span>
        <span class="ov-table-rows">${t.counts[name] ?? 0}</span>
        <span class="ov-table-today ${today > 0 ? "pos" : ""}">+${today}</span>
      </div>`;
  }).join("");

  return `
    <div class="ov-card">
      <div class="ov-card-head">
        <span class="ov-card-title">Browse raw tables</span>
        <span class="ov-card-sub">${t.dbSizeMb} MB</span>
      </div>
      <div class="ov-tables-header">
        <span>Table</span><span>Rows</span><span>Today</span>
      </div>
      ${rows}
    </div>`;
}

// ── Table viewer (self-contained, same as admin-database.js) ──────────────────

let _tableState = { name: null, page: 1 };

function openTable(name) {
  _tableState = { name, page: 1 };
  document.getElementById("tableModalTitle").textContent = name;
  document.getElementById("tableModalBody").innerHTML = '<div style="text-align:center;padding:2rem"><div class="spinner" style="margin:0 auto"></div></div>';
  document.getElementById("tableModalPager").innerHTML = "";
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
    document.getElementById("tableModalBody").innerHTML =
      `<p style="color:var(--kyc-danger);padding:1rem">${escHtml(data.error || "Failed to load table.")}</p>`;
    return;
  }
  renderTableRows(data);
}

function renderTableRows(data) {
  if (!data.rows.length) {
    document.getElementById("tableModalBody").innerHTML =
      '<div style="text-align:center;padding:2rem;color:var(--kyc-muted)">No records in this table.</div>';
    document.getElementById("tableModalPager").innerHTML = "";
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
    <span style="font-size:0.8125rem;color:var(--kyc-muted)">${data.total} record${data.total !== 1 ? "s" : ""} · page ${data.page} of ${data.pages}</span>
    <div style="display:flex;gap:0.5rem">
      <button class="btn-secondary" style="height:30px;padding:0 0.75rem;font-size:0.8125rem;min-height:unset" ${data.page <= 1 ? "disabled" : ""} onclick="fetchTablePage('${escHtml(data.table)}',${data.page - 1})">← Prev</button>
      <button class="btn-secondary" style="height:30px;padding:0 0.75rem;font-size:0.8125rem;min-height:unset" ${data.page >= data.pages ? "disabled" : ""} onclick="fetchTablePage('${escHtml(data.table)}',${data.page + 1})">Next →</button>
    </div>` :
    `<span style="font-size:0.8125rem;color:var(--kyc-muted)">${data.total} record${data.total !== 1 ? "s" : ""}</span><span></span>`;
}
