/* ─────────────────────────────────────────────────────────────────────────────
 * forgot-password.js — adds "Forgot password?" link + modal to a login page.
 *
 * Before this script's <script> tag, set:
 *   window.KYC_LOGIN_ROLE = "admin" | "agent" | "contact"
 *
 * The script:
 *   1. Finds the password input's label area and injects a "Forgot password?"
 *      link aligned to the right of the label.
 *   2. Appends a forgot-password modal to <body>.
 *   3. Submits the email to /api/auth/<role>/forgot-password and shows a
 *      confirmation. For "admin" it adds a CLI fallback note.
 *
 * Because the backend returns 200 regardless of whether the email matches
 * (deliberate, to avoid account enumeration), the success copy is generic.
 * ──────────────────────────────────────────────────────────────────────────── */

(function () {
  "use strict";

  const ROLE = ["admin","agent","contact"].includes(window.KYC_LOGIN_ROLE)
    ? window.KYC_LOGIN_ROLE : "contact";
  const ENDPOINT = `/api/auth/${ROLE}/forgot-password`;

  const COPY = {
    admin: {
      modalTitle: "Reset your admin password",
      modalSub: "Enter your admin email (or username) and we'll notify the other portal administrators to verify your identity.",
      field: "Email or username",
      placeholder: "admin",
      successTitle: "Request sent",
      successBody: "We've recorded your reset request. Another portal administrator will reach out to verify your identity and set a new password.",
      cliNote: true,
    },
    agent: {
      modalTitle: "Reset your password",
      modalSub: "Enter the email on your agent account and we'll loop in your portal administrator.",
      field: "Email address",
      placeholder: "you@agency.com",
      successTitle: "Request sent",
      successBody: "We've notified your portal administrator. They'll reach out shortly. You should hear back within one business day.",
      cliNote: false,
    },
    contact: {
      modalTitle: "Reset your password",
      modalSub: "Enter the email on your account and we'll notify your agent to help reset it.",
      field: "Email address",
      placeholder: "you@example.com",
      successTitle: "Request sent",
      successBody: "We've notified your assigned agent. They'll reach out with reset instructions.",
      cliNote: false,
    },
  }[ROLE];

  const MODAL_ID  = "fpModal";
  const LINK_ID   = "fpLink";

  const SVG = {
    mail:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
    send:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
    x:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    shield:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  };

  function init() {
    // 1) Inject the link.
    const pwInput = document.getElementById("password");
    if (!pwInput) return;
    const pwLabel = document.querySelector(`label[for="${pwInput.id}"]`)
                 || pwInput.closest("div")?.querySelector("label");
    if (!pwLabel) return;

    // Wrap the label so we can put the link on the right.
    const row = document.createElement("div");
    row.className = "fp-label-row";
    pwLabel.parentNode.insertBefore(row, pwLabel);
    row.appendChild(pwLabel);

    const link = document.createElement("button");
    link.type = "button";
    link.id = LINK_ID;
    link.className = "fp-link";
    link.textContent = "Forgot password?";
    row.appendChild(link);

    // 2) Append the modal.
    const modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.className = "modal-overlay fp-modal hidden";
    modal.innerHTML = `
      <div class="modal-backdrop" data-action="close"></div>
      <div class="fp-card" role="dialog" aria-modal="true" aria-labelledby="fpTitle">
        <div class="fp-head">
          <div class="fp-icon" id="fpIcon">${SVG.mail}</div>
          <div style="flex:1;min-width:0">
            <div id="fpTitle" class="fp-title">${COPY.modalTitle}</div>
            <div id="fpSub" class="fp-sub">${COPY.modalSub}</div>
          </div>
          <button type="button" class="fp-close" data-action="close" aria-label="Close">${SVG.x}</button>
        </div>

        <form id="fpForm" class="fp-body" novalidate>
          <div id="fpFormFields">
            <label class="fp-field-label" for="fpEmail">${COPY.field}</label>
            <input id="fpEmail" class="fp-input" type="text" placeholder="${COPY.placeholder}" autocomplete="email" />
            <div id="fpErr" class="fp-field-err"></div>
            ${COPY.cliNote ? `
              <div class="fp-banner fp-banner-info" style="margin-top:0.75rem">
                <span>${SVG.alert}</span>
                <span><b>Sole admin?</b> Run <code class="fp-code">npm run reset-admin &lt;username&gt;</code> on the server — it'll print a temporary password to the console.</span>
              </div>` : ""}
          </div>

          <div id="fpSuccess" class="hidden">
            <div class="fp-banner fp-banner-info">
              <span>${SVG.shield}</span>
              <span>For security, we don't say whether an account with that ${ROLE === "admin" ? "identifier" : "email"} exists. If you've waited and haven't heard back, contact ${ROLE === "contact" ? "your agent" : "your administrator"} directly.</span>
            </div>
          </div>
        </form>

        <div class="fp-actions" id="fpActions">
          <button type="button" class="um-btn um-btn-ghost" data-action="close">Cancel</button>
          <button type="button" class="um-btn um-btn-primary" id="fpSubmit">Send request</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // 3) Wire events.
    link.addEventListener("click", openModal);
    modal.addEventListener("click", (e) => {
      if (e.target.closest("[data-action='close']")) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
    });
    document.getElementById("fpSubmit").addEventListener("click", submit);
    modal.querySelector("form").addEventListener("submit", (e) => { e.preventDefault(); submit(); });

    document.getElementById("fpEmail").addEventListener("input", () => {
      document.getElementById("fpErr").textContent = "";
    });
  }

  function openModal() {
    const m = document.getElementById(MODAL_ID);
    document.getElementById("fpEmail").value = "";
    document.getElementById("fpErr").textContent = "";
    document.getElementById("fpFormFields").classList.remove("hidden");
    document.getElementById("fpSuccess").classList.add("hidden");
    // Reset to default action buttons.
    document.getElementById("fpActions").innerHTML = `
      <button type="button" class="um-btn um-btn-ghost" data-action="close">Cancel</button>
      <button type="button" class="um-btn um-btn-primary" id="fpSubmit">Send request</button>
    `;
    document.getElementById("fpSubmit").addEventListener("click", submit);

    document.querySelector("#fpIcon").innerHTML = SVG.mail;
    document.querySelector("#fpTitle").textContent = COPY.modalTitle;
    document.querySelector("#fpSub").textContent   = COPY.modalSub;

    m.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    setTimeout(() => document.getElementById("fpEmail").focus(), 80);
  }

  function closeModal() {
    document.getElementById(MODAL_ID).classList.add("hidden");
    document.body.style.overflow = "";
  }

  function isValid(input) {
    if (!input) return false;
    if (ROLE === "admin") return input.length >= 2; // username or email
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
  }

  async function submit() {
    const input = document.getElementById("fpEmail").value.trim();
    const errEl = document.getElementById("fpErr");
    errEl.textContent = "";
    if (!isValid(input)) {
      errEl.textContent = ROLE === "admin"
        ? "Enter your admin email or username."
        : "Please enter a valid email address.";
      return;
    }

    const btn = document.getElementById("fpSubmit");
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="um-spin"></span> Sending…`;

    try {
      await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: input }),
      });
    } catch {}

    // Always present success — we deliberately don't leak whether the address
    // matched. The user-facing copy is generic.
    document.querySelector("#fpIcon").innerHTML = SVG.send;
    document.querySelector("#fpTitle").textContent = COPY.successTitle;
    document.querySelector("#fpSub").textContent   = COPY.successBody;
    document.getElementById("fpFormFields").classList.add("hidden");
    document.getElementById("fpSuccess").classList.remove("hidden");
    document.getElementById("fpActions").innerHTML = `
      <button type="button" class="um-btn um-btn-primary" data-action="close">Back to sign in</button>
    `;
    document.querySelector("[data-action='close']").addEventListener("click", closeModal);

    btn.disabled = false;
    btn.innerHTML = orig;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
