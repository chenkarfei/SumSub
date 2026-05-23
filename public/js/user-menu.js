/* ─────────────────────────────────────────────────────────────────────────────
 * user-menu.js — sidebar avatar menu with Change Password modal.
 *
 * Drop this into any dashboard page that has a `.dashboard-sidebar-footer`.
 * Before the script tag, set:    window.KYC_ROLE = "admin"  (or "agent")
 *
 * Side effects on the page:
 *   1. The Settings nav link (anchor whose href ends in /dashboard/settings) is removed if present.
 *   2. The footer contents are replaced with a popover trigger pill.
 *   3. A change-password modal is appended to <body>.
 *
 * Logout still uses the global logoutAdmin()/logoutAgent() from utils.js.
 * ──────────────────────────────────────────────────────────────────────────── */

(function () {
  "use strict";

  const ROLE = window.KYC_ROLE === "agent" ? "agent" : "admin";
  const API_ME   = ROLE === "agent" ? "/api/agent/me" : "/api/admin/me";
  const API_PW   = ROLE === "agent" ? "/api/agent/profile/password" : "/api/admin/profile/password";
  const LOGOUT   = ROLE === "agent" ? window.logoutAgent : window.logoutAdmin;

  // ── Markup ────────────────────────────────────────────────────────────────

  const POPOVER_ID = "umPopover";
  const TRIGGER_ID = "umTrigger";
  const MODAL_ID   = "umChangePwModal";

  const SVG = {
    key:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-9.6 9.6"/><circle cx="6.5" cy="16.5" r="5.5"/><path d="M14 9l3 3M19 4l3 3"/></svg>`,
    logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>`,
    chev:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
    eye:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    eyeOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.06 10.06 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
    x:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    check:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    alert:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };

  // ── Password strength ────────────────────────────────────────────────────

  function strengthOf(pw) {
    if (!pw) return { score: 0, label: "", klass: "" };
    let s = 0;
    if (pw.length >= 8)  s++;
    if (pw.length >= 12) s++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
    if (/\d/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    s = Math.min(s, 4);
    const labels  = ["", "Weak", "Fair", "Good", "Strong"];
    const klasses = ["", "on-weak", "on-fair", "on-good", "on-strong"];
    return { score: s, label: labels[s], klass: klasses[s] };
  }

  // ── DOM setup ─────────────────────────────────────────────────────────────

  function init() {
    // 1) Remove Settings nav link if it exists.
    document.querySelectorAll(".dashboard-nav a, .nav-link").forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (/\/dashboard\/settings\/?$/.test(href)) a.remove();
    });

    // 2) Replace the sidebar footer's contents with our trigger pill.
    const footer = document.querySelector(".dashboard-sidebar-footer");
    if (!footer) return; // page has no sidebar — nothing to do

    footer.innerHTML = `
      <button type="button" id="${TRIGGER_ID}" class="um-pill" aria-haspopup="menu" aria-expanded="false">
        <div class="dashboard-user-avatar" id="umAvatar">·</div>
        <div style="min-width:0;flex:1;text-align:left">
          <div class="dashboard-user-name" id="umName">…</div>
          <div class="dashboard-user-role" id="umRole">${ROLE === "agent" ? "Agent" : "Administrator"}</div>
        </div>
        <span class="um-chev">${SVG.chev}</span>
      </button>
      <div id="${POPOVER_ID}" class="um-popover" role="menu" hidden>
        <div class="um-pop-header">
          <div class="um-pop-avatar" id="umPopAvatar">·</div>
          <div style="min-width:0">
            <div class="um-pop-name" id="umPopName">—</div>
            <div class="um-pop-email" id="umPopEmail">—</div>
          </div>
        </div>
        <button type="button" class="um-pop-item" data-action="change-pw">
          ${SVG.key} Change password
        </button>
        <div class="um-pop-divider"></div>
        <button type="button" class="um-pop-item danger" data-action="signout">
          ${SVG.logout} Sign out
        </button>
      </div>
    `;
    footer.style.position = "relative";

    // 3) Create shims for IDs that lived in the old sidebar footer.
    //    Done AFTER footer.innerHTML is replaced so getElementById no longer
    //    finds the originals — the check correctly creates the body-level spans.
    //    Other scripts (admin-dashboard.js → #userName/#userInitial,
    //    agent-dashboard.js → #agentName/#agentSubdomain) write to these IDs
    //    after their async fetches resolve; without the shims they'd crash.
    ["userName","userInitial","agentName","agentSubdomain"].forEach(id => {
      if (!document.getElementById(id)) {
        const span = document.createElement("span");
        span.id = id;
        span.style.display = "none";
        document.body.appendChild(span);
      }
    });

    // 4) Append the change-password modal markup to <body>.
    const modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.className = "modal-overlay um-modal hidden";
    modal.innerHTML = `
      <div class="modal-backdrop" data-action="close"></div>
      <div class="um-modal-card" role="dialog" aria-modal="true" aria-labelledby="umModalTitle">
        <div class="um-modal-head">
          <div class="um-modal-icon" id="umModalIcon">${SVG.key}</div>
          <div style="flex:1;min-width:0">
            <div id="umModalTitle" class="um-modal-title">Change password</div>
            <div id="umModalSub" class="um-modal-sub">Use a strong password you don't use anywhere else.</div>
          </div>
          <button class="um-modal-close" type="button" data-action="close" aria-label="Close">${SVG.x}</button>
        </div>

        <form id="umChangePwForm" class="um-modal-body" novalidate>
          <div id="umBanner" class="um-banner um-banner-warn hidden">
            <span>${SVG.alert}</span>
            <span id="umBannerMsg"></span>
          </div>

          <div>
            <label class="um-field-label" for="umCur">Current password</label>
            <div class="um-input-wrap">
              <input id="umCur" class="um-input" type="password" autocomplete="current-password" placeholder="Enter your current password" />
              <button type="button" class="um-input-eye" data-toggle="umCur" aria-label="Toggle visibility">${SVG.eye}</button>
            </div>
          </div>

          <div>
            <label class="um-field-label" for="umNeu">New password</label>
            <div class="um-input-wrap">
              <input id="umNeu" class="um-input" type="password" autocomplete="new-password" placeholder="At least 8 characters" />
              <button type="button" class="um-input-eye" data-toggle="umNeu" aria-label="Toggle visibility">${SVG.eye}</button>
            </div>
            <div id="umStrength" class="um-strength hidden">
              <div class="um-strength-bars"><i></i><i></i><i></i><i></i></div>
              <div class="um-strength-label">Strength: <b></b></div>
            </div>
            <div id="umNeuErr" class="um-field-err"></div>
            <div id="umHint" class="um-field-hint">Tip: mix letters, numbers, and a symbol. 12+ chars is best.</div>
          </div>

          <div>
            <label class="um-field-label" for="umConf">Confirm new password</label>
            <input id="umConf" class="um-input" type="password" autocomplete="new-password" placeholder="Re-enter your new password" />
            <div id="umConfErr" class="um-field-err"></div>
          </div>
        </form>

        <div class="um-modal-actions">
          <button type="button" class="um-btn um-btn-ghost" data-action="close">Cancel</button>
          <button type="button" class="um-btn um-btn-primary" id="umSubmit">Update password</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // 5) Fetch the user's info & populate.
    populate();

    // 6) Wire up events.
    bind();
  }

  // ── Fetch user info ──────────────────────────────────────────────────────

  async function populate() {
    try {
      const res  = await fetch(API_ME);
      if (!res.ok) return;
      const me   = await res.json();
      const name = me.name || me.username || "User";
      const sub  = ROLE === "agent" ? (me.email || me.username || "") : (me.username || "");
      const initial = name.charAt(0).toUpperCase();

      document.getElementById("umAvatar").textContent    = initial;
      document.getElementById("umName").textContent      = name;
      document.getElementById("umPopAvatar").textContent = initial;
      document.getElementById("umPopName").textContent   = name;
      document.getElementById("umPopEmail").textContent  = sub;

      // Some existing pages still reference these old IDs in their own
      // init code (e.g. admin-dashboard.js sets userName / userInitial,
      // agent-dashboard.js sets agentName / agentSubdomain). To keep those
      // working we mirror values into hidden shims.
      shim("userName", name);
      shim("userInitial", initial);
      shim("agentName", name);
      shim("agentSubdomain", me.subdomain || sub);
    } catch {}
  }

  function shim(id, value) {
    if (!document.getElementById(id)) {
      const s = document.createElement("span");
      s.id = id;
      s.style.display = "none";
      document.body.appendChild(s);
    }
    document.getElementById(id).textContent = value;
  }

  // ── Events ────────────────────────────────────────────────────────────────

  function bind() {
    const trigger  = document.getElementById(TRIGGER_ID);
    const popover  = document.getElementById(POPOVER_ID);
    const modal    = document.getElementById(MODAL_ID);

    // Popover toggle
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = !popover.hasAttribute("hidden");
      if (isOpen) closePopover();
      else openPopover();
    });

    // Click outside closes
    document.addEventListener("click", (e) => {
      if (popover.hasAttribute("hidden")) return;
      if (popover.contains(e.target) || trigger.contains(e.target)) return;
      closePopover();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !popover.hasAttribute("hidden")) closePopover();
    });

    // Popover items
    popover.addEventListener("click", (e) => {
      const item = e.target.closest("[data-action]");
      if (!item) return;
      const action = item.dataset.action;
      closePopover();
      if (action === "change-pw") openModal();
      else if (action === "signout") LOGOUT && LOGOUT();
    });

    // Modal close (backdrop, X, Cancel)
    modal.addEventListener("click", (e) => {
      const t = e.target.closest("[data-action='close']");
      if (t) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
    });

    // Eye toggles
    modal.querySelectorAll(".um-input-eye").forEach((btn) => {
      btn.addEventListener("click", () => {
        const input = document.getElementById(btn.dataset.toggle);
        const isPw  = input.type === "password";
        input.type  = isPw ? "text" : "password";
        btn.innerHTML = isPw ? SVG.eyeOff : SVG.eye;
      });
    });

    // Live validation feedback
    const neu  = document.getElementById("umNeu");
    const conf = document.getElementById("umConf");
    const cur  = document.getElementById("umCur");

    neu.addEventListener("input", () => {
      updateStrength(neu.value);
      validateClient({ silent: true });
    });
    conf.addEventListener("input", () => validateClient({ silent: true }));
    cur.addEventListener("input",  () => clearBanner());

    document.getElementById("umSubmit").addEventListener("click", submit);
    // Enter in any input submits.
    modal.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      submit();
    });
  }

  function openPopover() {
    const popover = document.getElementById(POPOVER_ID);
    const trigger = document.getElementById(TRIGGER_ID);
    popover.removeAttribute("hidden");
    trigger.setAttribute("aria-expanded", "true");
    trigger.classList.add("is-open");
  }
  function closePopover() {
    const popover = document.getElementById(POPOVER_ID);
    const trigger = document.getElementById(TRIGGER_ID);
    popover.setAttribute("hidden", "");
    trigger.setAttribute("aria-expanded", "false");
    trigger.classList.remove("is-open");
  }

  // ── Modal flow ───────────────────────────────────────────────────────────

  function openModal() {
    const modal = document.getElementById(MODAL_ID);
    // Reset to form stage
    setStage("form");
    document.getElementById("umCur").value  = "";
    document.getElementById("umNeu").value  = "";
    document.getElementById("umConf").value = "";
    document.getElementById("umStrength").classList.add("hidden");
    document.getElementById("umNeuErr").textContent  = "";
    document.getElementById("umConfErr").textContent = "";
    document.getElementById("umHint").classList.remove("hidden");
    clearBanner();
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    setTimeout(() => document.getElementById("umCur").focus(), 80);
  }

  function closeModal() {
    const modal = document.getElementById(MODAL_ID);
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  function setStage(stage) {
    const modal = document.getElementById(MODAL_ID);
    if (stage === "success") {
      modal.querySelector("#umModalIcon").className = "um-modal-icon success";
      modal.querySelector("#umModalIcon").innerHTML = SVG.check;
      modal.querySelector("#umModalTitle").textContent = "Password updated";
      modal.querySelector("#umModalSub").textContent =
        "Your password has been changed. Use the new one on your next sign-in.";
      modal.querySelector("form").style.display = "none";
      modal.querySelector(".um-modal-actions").innerHTML =
        `<button type="button" class="um-btn um-btn-primary" data-action="close">Done</button>`;
      modal.querySelector(".um-modal-actions [data-action='close']")
        .addEventListener("click", closeModal);
    } else {
      modal.querySelector("#umModalIcon").className = "um-modal-icon";
      modal.querySelector("#umModalIcon").innerHTML = SVG.key;
      modal.querySelector("#umModalTitle").textContent = "Change password";
      modal.querySelector("#umModalSub").textContent =
        "Use a strong password you don't use anywhere else.";
      modal.querySelector("form").style.display = "";
      // Restore the default action buttons.
      modal.querySelector(".um-modal-actions").innerHTML = `
        <button type="button" class="um-btn um-btn-ghost" data-action="close">Cancel</button>
        <button type="button" class="um-btn um-btn-primary" id="umSubmit">Update password</button>
      `;
      modal.querySelector("[data-action='close']").addEventListener("click", closeModal);
      document.getElementById("umSubmit").addEventListener("click", submit);
    }
  }

  function updateStrength(pw) {
    const wrap  = document.getElementById("umStrength");
    const bars  = wrap.querySelectorAll(".um-strength-bars i");
    const label = wrap.querySelector(".um-strength-label b");
    if (!pw) {
      wrap.classList.add("hidden");
      return;
    }
    wrap.classList.remove("hidden");
    document.getElementById("umHint").classList.add("hidden");
    const s = strengthOf(pw);
    bars.forEach((b, i) => {
      b.className = s.score > i ? s.klass : "";
    });
    label.textContent = s.label;
  }

  function validateClient({ silent } = {}) {
    const cur  = document.getElementById("umCur").value;
    const neu  = document.getElementById("umNeu").value;
    const conf = document.getElementById("umConf").value;
    const neuErr  = document.getElementById("umNeuErr");
    const confErr = document.getElementById("umConfErr");

    let ok = true;
    neuErr.textContent  = "";
    confErr.textContent = "";

    if (neu && neu.length < 8) { neuErr.textContent = "At least 8 characters."; ok = false; }
    else if (neu && cur && neu === cur) { neuErr.textContent = "Must differ from current password."; ok = false; }
    if (conf && neu !== conf)            { confErr.textContent = "Passwords don't match.";          ok = false; }

    if (!silent) {
      if (!cur)  { showBanner("Enter your current password."); ok = false; }
      else if (!neu)  { showBanner("Enter a new password."); ok = false; }
      else if (!conf) { showBanner("Confirm your new password."); ok = false; }
    }
    return ok && cur && neu && conf;
  }

  function showBanner(msg) {
    document.getElementById("umBannerMsg").textContent = msg;
    document.getElementById("umBanner").classList.remove("hidden");
  }
  function clearBanner() {
    document.getElementById("umBanner").classList.add("hidden");
    document.getElementById("umBannerMsg").textContent = "";
  }

  async function submit() {
    if (!validateClient()) return;

    const btn = document.getElementById("umSubmit");
    const cur = document.getElementById("umCur").value;
    const neu = document.getElementById("umNeu").value;
    const orig = btn.innerHTML;
    btn.disabled  = true;
    btn.innerHTML = `<span class="um-spin"></span> Updating…`;
    clearBanner();

    let data, ok;
    try {
      const res = await fetch(API_PW, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: cur, newPassword: neu }),
      });
      data = await res.json().catch(() => ({}));
      ok = res.ok;
    } catch {
      ok = false;
      data = { error: "Network error. Please try again." };
    }

    btn.disabled  = false;
    btn.innerHTML = orig;

    if (!ok) {
      showBanner(data.error || "Failed to update password.");
      return;
    }
    setStage("success");
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
