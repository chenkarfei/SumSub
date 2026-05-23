/* ── SecureVerify KYC — Main App ─────────────────────────────────────────── */

const STEPS = [
  { id: "form",            num: 1, label: "Personal Details",  desc: "Your basic information" },
  { id: "verification",    num: 2, label: "Identity & Selfie",  desc: "ID document + liveness" },
  { id: "proof-of-address",num: 3, label: "Proof of Address",  desc: "Utility bill or letter" },
  { id: "bank-statement",  num: 4, label: "Bank Statement",    desc: "3 months recent" },
  { id: "agreement",       num: 5, label: "Agreement",         desc: "Signed agreement" },
];

const STEP_INDEX = { form:0, verification:1, "proof-of-address":2, "bank-statement":3, agreement:4, status:5 };

// ── App state ─────────────────────────────────────────────────────────────────
const state = {
  step: "form",
  isSubmitting: false,
  isRefreshing: false,
  accessToken: null,
  applicantId: null,
  userData: null,
  verificationStatus: null,
  error: null,
};

// ── Heartbeat ─────────────────────────────────────────────────────────────────
setInterval(async () => {
  try {
    const res = await fetch("/api/auth/contact/heartbeat", { method: "POST" });
    if (!res.ok) window.location.href = "/login?reason=expired";
  } catch { /* network hiccup */ }
}, 30_000);

// ── Init ──────────────────────────────────────────────────────────────────────
(async function init() {
  await Promise.resolve();
  const savedEmail = localStorage.getItem("kyc_user_email");
  if (savedEmail) {
    await fetchUserStatus(savedEmail);
  } else {
    renderStep();
  }
})();

// ── Fetch user status & determine step ────────────────────────────────────────
async function fetchUserStatus(userId) {
  try {
    showLoadingState(true);
    const res = await fetch(`/api/user?userId=${encodeURIComponent(userId)}`);
    if (res.ok) {
      const data = await res.json();
      state.userData = {
        firstName: data.firstName, lastName: data.lastName,
        dateOfBirth: data.dateOfBirth, nationality: data.nationality,
        email: data.email, phone: data.phone || "",
        countryOfResidence: data.countryOfResidence,
        sourceOfFunds: data.sourceOfFunds, sourceOfWealth: data.sourceOfWealth,
      };
      state.applicantId = data.applicantId;
      state.verificationStatus = data.status;

      const poaDone  = !!data.proofOfAddressPath;
      const bankDone = !!data.bankStatementPath;
      const agrDone  = !!data.agreementPath;
      const sumsubDone = ["GREEN","RED","RETRY"].includes(data.status) || poaDone || bankDone || agrDone;

      if (!sumsubDone) {
        const vRes = await fetch("/api/verify", {
          method: "POST", headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ email: data.email }),
        });
        const vData = await vRes.json();
        if (vRes.ok) { state.accessToken = vData.accessToken; goTo("verification"); }
        else goTo("status");
      } else if (["RED","RETRY"].includes(data.status)) {
        goTo("status");
      } else {
        if (!poaDone)  goTo("proof-of-address");
        else if (!bankDone) goTo("bank-statement");
        else if (!agrDone)  goTo("agreement");
        else goTo("status");
      }
    } else if (res.status === 404) {
      localStorage.removeItem("kyc_user_email");
    }
  } catch (e) {
    /* stay on current step */
  } finally {
    showLoadingState(false);
    renderStep();
  }
}

// ── Navigation ────────────────────────────────────────────────────────────────
function goTo(step) {
  state.step = step;
  state.error = null;
}

// ── Sidebar render ────────────────────────────────────────────────────────────
function renderSidebar() {
  const cur = STEP_INDEX[state.step];
  const allDone = state.step === "status";

  let html = "";
  STEPS.forEach((s, i) => {
    const done   = i < cur || allDone;
    const active = i === cur && !allDone;
    const numState = done ? "done" : active ? "active" : "pending";
    const labelState = done ? "done" : active ? "active" : "pending";

    html += `<div class="kyc-step-item">
      <div class="kyc-step-col">
        <div class="kyc-step-num ${numState}">
          ${done
            ? `<svg width="14" height="14" fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
            : `<span>${s.num}</span>`}
        </div>
        ${i < STEPS.length - 1 ? `<div class="kyc-step-connector ${done ? "done" : "pending"}"></div>` : ""}
      </div>
      <div class="kyc-step-label ${labelState}">
        <p class="kyc-step-label-text ${numState}">${s.label}</p>
        <p class="kyc-step-desc">${s.desc}</p>
      </div>
    </div>`;
  });

  document.getElementById("stepList").innerHTML = html;
}

// ── Mobile header render ──────────────────────────────────────────────────────
function renderMobileHeader() {
  const cur = STEP_INDEX[state.step];
  const isStatus = state.step === "status";
  const progress = isStatus ? 100 : (cur / STEPS.length) * 100;

  document.getElementById("progressBar").style.width = `${progress}%`;

  const counter = document.getElementById("mobileStepCounter");
  if (!isStatus) {
    counter.textContent = `${cur + 1} / ${STEPS.length}`;
    counter.classList.remove("hidden");
  } else {
    counter.classList.add("hidden");
  }
}

// ── Desktop heading render ────────────────────────────────────────────────────
function renderDesktopHeading() {
  const heading = document.getElementById("desktopHeading");
  if (state.step === "status") {
    document.getElementById("stepEyebrow").textContent = "";
    document.getElementById("stepTitle").textContent = "Verification Status";
    document.getElementById("stepSubtitle").textContent = "Review your verification progress";
    heading.style.display = "block";
    return;
  }
  const cur = STEP_INDEX[state.step];
  const meta = STEPS[cur];
  if (meta) {
    document.getElementById("stepEyebrow").textContent = `Step ${meta.num} of ${STEPS.length}`;
    document.getElementById("stepTitle").textContent = meta.label;
    document.getElementById("stepSubtitle").textContent = meta.desc;
    heading.style.display = "block";
  }
}

// ── Loading state ─────────────────────────────────────────────────────────────
function showLoadingState(show) {
  state.isRefreshing = show;
  const loading = document.getElementById("loadingState");
  const content = document.getElementById("stepContent");
  const heading = document.getElementById("desktopHeading");
  const footer  = document.querySelector(".kyc-footer-note");
  if (show) {
    loading.style.display = "flex";
    loading.classList.remove("hidden");
    content.classList.add("hidden");
    if (heading) heading.style.display = "none";
    if (footer) footer.style.display = "none";
  } else {
    loading.style.display = "none";
    loading.classList.add("hidden");
    content.classList.remove("hidden");
    if (footer) footer.style.display = "";
  }
}

// ── Main render ───────────────────────────────────────────────────────────────
function renderStep() {
  if (state.isRefreshing) return;
  renderSidebar();
  renderMobileHeader();
  renderDesktopHeading();

  const content = document.getElementById("stepContent");
  content.className = "animate-slide-up space-y-5";
  content.innerHTML = "";

  // Error banner
  if (state.error) {
    const banner = document.createElement("div");
    banner.innerHTML = `
      <div class="error-banner">
        <div class="error-banner-icon">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12" stroke-width="2"/><line x1="12" y1="16" x2="12.01" y2="16" stroke-width="2"/></svg>
        </div>
        <div>
          <p class="error-banner-msg">${escHtml(state.error)}</p>
          <span class="error-banner-dismiss" onclick="state.error=null;renderStep()">Dismiss</span>
        </div>
      </div>`;
    content.appendChild(banner);
  }

  switch (state.step) {
    case "form":           renderFormStep(content); break;
    case "verification":   renderVerificationStep(content); break;
    case "proof-of-address": renderUploadStep(content, "proof-of-address"); break;
    case "bank-statement": renderUploadStep(content, "bank-statement"); break;
    case "agreement":      renderAgreementStep(content); break;
    case "status":         renderStatusStep(content); break;
  }
}

// ── Step 1: Personal Details Form ─────────────────────────────────────────────
const formData = {
  firstName:"", lastName:"", dateOfBirth:"", nationality:"",
  email:"", phone:"", countryOfResidence:"", sourceOfFunds:"", sourceOfWealth:"",
};
const formErrors  = {};
const formTouched = {};

const NATIONALITY_OPTIONS = [
  {value:"MYS",label:"Malaysia"},{value:"SGP",label:"Singapore"},{value:"IDN",label:"Indonesia"},
  {value:"THA",label:"Thailand"},{value:"VNM",label:"Vietnam"},{value:"PHL",label:"Philippines"},
  {value:"CHN",label:"China"},{value:"IND",label:"India"},{value:"USA",label:"United States"},
  {value:"GBR",label:"United Kingdom"},{value:"AUS",label:"Australia"},{value:"JPN",label:"Japan"},
  {value:"KOR",label:"South Korea"},{value:"ARE",label:"United Arab Emirates"},{value:"OTH",label:"Other"},
];
const COUNTRY_OPTIONS = NATIONALITY_OPTIONS;
const SOURCE_OF_FUNDS = [
  {value:"salary",label:"Employment Salary"},{value:"business_income",label:"Business Income"},
  {value:"investments",label:"Investment Returns"},{value:"inheritance",label:"Inheritance"},
  {value:"gift",label:"Gift"},{value:"savings",label:"Personal Savings"},
  {value:"property_sale",label:"Property Sale"},{value:"crypto",label:"Cryptocurrency"},{value:"other",label:"Other"},
];
const SOURCE_OF_WEALTH = [
  {value:"employment",label:"Long-term Employment"},{value:"business_ownership",label:"Business Ownership"},
  {value:"investments_portfolio",label:"Investment Portfolio"},{value:"inheritance_wealth",label:"Inheritance"},
  {value:"real_estate",label:"Real Estate Holdings"},{value:"crypto_wealth",label:"Cryptocurrency Holdings"},
  {value:"other_wealth",label:"Other"},
];

function selectOpts(opts, current) {
  return opts.map(o => `<option value="${o.value}" ${current===o.value?"selected":""}>${escHtml(o.label)}</option>`).join("");
}

function fieldClass(name, isSelect) {
  const err = formTouched[name] && formErrors[name];
  return err ? (isSelect ? "field-select-error" : "field-input-error") : (isSelect ? "field-select" : "field-input");
}

function errHtml(name) {
  const msg = formTouched[name] && formErrors[name];
  return `<p class="field-error">${msg ? `<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>${escHtml(msg)}` : ""}</p>`;
}

function renderFormStep(container) {
  const div = document.createElement("div");
  div.className = "premium-card";
  div.innerHTML = `
    <!-- Mobile intro -->
    <div style="margin-bottom:1.25rem" class="lg-hidden">
      <h2 style="font-size:1.25rem;font-weight:700;color:var(--kyc-text);letter-spacing:-0.02em">Personal Details</h2>
      <p style="font-size:0.875rem;color:var(--kyc-muted);margin-top:0.375rem">Please enter your details as they appear on your identity document.</p>
    </div>

    <form id="kycForm" novalidate class="space-y-5">

      <!-- Identity -->
      <div class="form-section-header"><span>Identity</span></div>

      <div class="grid-2">
        <div>
          <label class="field-label" for="firstName">First Name *</label>
          <input id="firstName" type="text" class="${fieldClass("firstName")}" value="${escHtml(formData.firstName)}" placeholder="John" autocomplete="given-name" />
          ${errHtml("firstName")}
        </div>
        <div>
          <label class="field-label" for="lastName">Last Name *</label>
          <input id="lastName" type="text" class="${fieldClass("lastName")}" value="${escHtml(formData.lastName)}" placeholder="Doe" autocomplete="family-name" />
          ${errHtml("lastName")}
        </div>
      </div>

      <div class="grid-2-sm">
        <div>
          <label class="field-label" for="dateOfBirth">Date of Birth *</label>
          <input id="dateOfBirth" type="text" class="${fieldClass("dateOfBirth")}" value="${escHtml(formData.dateOfBirth)}" placeholder="YYYY-MM-DD" maxlength="10" inputmode="numeric" />
          ${errHtml("dateOfBirth")}
        </div>
        <div>
          <label class="field-label" for="nationality">Nationality *</label>
          <select id="nationality" class="${fieldClass("nationality",true)}">
            <option value="">Select nationality</option>
            ${selectOpts(NATIONALITY_OPTIONS, formData.nationality)}
          </select>
          ${errHtml("nationality")}
        </div>
      </div>

      <!-- Contact -->
      <div class="form-section-header"><span>Contact</span></div>

      <div>
        <label class="field-label" for="email">Email Address *</label>
        <input id="email" type="email" class="${fieldClass("email")}" value="${escHtml(formData.email)}" placeholder="you@example.com" autocomplete="email" inputmode="email" />
        ${errHtml("email")}
      </div>

      <div>
        <label class="field-label" for="phone">Phone Number</label>
        <input id="phone" type="tel" class="${fieldClass("phone")}" value="${escHtml(formData.phone)}" placeholder="+60 12 345 6789" autocomplete="tel" inputmode="tel" />
        ${errHtml("phone")}
      </div>

      <!-- Compliance -->
      <div class="form-section-header"><span>Compliance</span></div>

      <div>
        <label class="field-label" for="countryOfResidence">Country of Residence *</label>
        <select id="countryOfResidence" class="${fieldClass("countryOfResidence",true)}">
          <option value="">Select country</option>
          ${selectOpts(COUNTRY_OPTIONS, formData.countryOfResidence)}
        </select>
        ${errHtml("countryOfResidence")}
      </div>

      <div class="grid-2-sm">
        <div>
          <label class="field-label" for="sourceOfFunds">Source of Funds *</label>
          <select id="sourceOfFunds" class="${fieldClass("sourceOfFunds",true)}">
            <option value="">Select source</option>
            ${selectOpts(SOURCE_OF_FUNDS, formData.sourceOfFunds)}
          </select>
          ${errHtml("sourceOfFunds")}
        </div>
        <div>
          <label class="field-label" for="sourceOfWealth">Source of Wealth *</label>
          <select id="sourceOfWealth" class="${fieldClass("sourceOfWealth",true)}">
            <option value="">Select source</option>
            ${selectOpts(SOURCE_OF_WEALTH, formData.sourceOfWealth)}
          </select>
          ${errHtml("sourceOfWealth")}
        </div>
      </div>

      <!-- Privacy note -->
      <div class="info-note">
        <svg width="14" height="14" fill="none" stroke="var(--kyc-muted)" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <p>Your information is encrypted end-to-end and will never be shared without your explicit consent.</p>
      </div>

      <!-- Submit -->
      <button type="submit" id="submitBtn" class="btn-primary" style="margin-top:0.5rem">
        ${state.isSubmitting
          ? `<span class="spinner"></span> Setting up verification...`
          : `Begin Verification <svg width="16" height="16" fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`}
      </button>
    </form>`;

  container.appendChild(div);

  // Attach events
  const fields = ["firstName","lastName","dateOfBirth","nationality","email","phone","countryOfResidence","sourceOfFunds","sourceOfWealth"];
  fields.forEach(f => {
    const el = document.getElementById(f);
    if (!el) return;
    el.addEventListener("input", () => {
      let val = el.value;
      if (f === "dateOfBirth") val = el.value = formatDOB(val);
      if (f === "phone") val = el.value = formatPhone(val);
      formData[f] = val;
      if (formTouched[f]) { formErrors[f] = validateField(f, val); refreshFieldUI(f); }
    });
    el.addEventListener("blur", () => {
      formTouched[f] = true;
      formErrors[f] = validateField(f, el.value);
      refreshFieldUI(f);
    });
  });

  document.getElementById("kycForm").addEventListener("submit", handleFormSubmit);
}

function refreshFieldUI(name) {
  const el = document.getElementById(name);
  if (!el) return;
  const isSelect = el.tagName === "SELECT";
  const err = formTouched[name] && formErrors[name];
  el.className = err ? (isSelect ? "field-select-error" : "field-input-error") : (isSelect ? "field-select" : "field-input");
  const errEl = el.parentElement?.querySelector(".field-error");
  if (errEl) errEl.innerHTML = err
    ? `<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>${escHtml(err)}`
    : "";
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const fields = ["firstName","lastName","dateOfBirth","nationality","email","phone","countryOfResidence","sourceOfFunds","sourceOfWealth"];
  let hasError = false;
  fields.forEach(f => {
    formTouched[f] = true;
    formErrors[f] = validateField(f, formData[f]);
    if (formErrors[f]) hasError = true;
    refreshFieldUI(f);
  });
  if (hasError) return;

  state.isSubmitting = true;
  state.error = null;
  renderStep();

  try {
    const res = await fetch("/api/verify", {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify(formData),
    });
    const result = await res.json();
    if (!res.ok) { state.error = result.error || "Failed to start verification."; state.isSubmitting = false; renderStep(); return; }

    localStorage.setItem("kyc_user_email", formData.email.toLowerCase().trim());
    state.userData = { ...formData };
    state.accessToken = result.accessToken;
    state.applicantId = result.record.applicantId;
    state.verificationStatus = "processing";
    state.isSubmitting = false;
    goTo("verification");
    renderStep();
  } catch {
    state.error = "Network error. Please check your connection and try again.";
    state.isSubmitting = false;
    renderStep();
  }
}

// ── Step 2: Sumsub WebSDK ─────────────────────────────────────────────────────
function renderVerificationStep(container) {
  const div = document.createElement("div");
  div.innerHTML = `
    <div class="premium-card" id="kycVerifCard">
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem">
        <div style="width:48px;height:48px;border-radius:14px;background:var(--gradient-btn);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:var(--shadow-md)">
          <svg width="24" height="24" fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        </div>
        <div>
          <div style="display:flex;align-items:center;gap:0.5rem">
            <h2 style="font-size:1rem;font-weight:700;color:var(--kyc-text);margin:0">Identity & Selfie</h2>
            <span class="badge badge-primary">Step 2 of 5</span>
          </div>
          <p style="font-size:0.875rem;color:var(--kyc-muted);margin:0.25rem 0 0">Upload your ID document and take a selfie</p>
        </div>
      </div>

      <!-- SDK container -->
      <div id="sumsubWebSdk" style="min-height:400px"></div>

      <!-- Security badges -->
      <div style="display:flex;align-items:center;justify-content:center;gap:1.5rem;margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid var(--kyc-border)">
        <div class="trust-dot">Encrypted</div>
        <div class="trust-dot">Secure</div>
        <div class="trust-dot">Private</div>
      </div>
    </div>

    <div id="kycContinueBtn" class="hidden">
      <button onclick="handleVerificationContinue()" class="btn-primary">
        Continue to Next Step
        <svg width="16" height="16" fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </button>
    </div>`;

  container.appendChild(div);
  loadSumsubSDK();
}

function loadSumsubSDK() {
  if (!state.accessToken) return;
  const script = document.createElement("script");
  script.src = "https://static.sumsub.com/idensic/static/sns-websdk-builder.js";
  script.onload = initSumsubSDK;
  script.onerror = () => { state.error = "Failed to load identity verification. Please try again."; renderStep(); };
  document.head.appendChild(script);
}

function initSumsubSDK() {
  if (typeof SumsubWebSdk === "undefined") { state.error = "Verification SDK unavailable."; renderStep(); return; }

  const sdk = SumsubWebSdk.init(state.accessToken, () => Promise.resolve(state.accessToken))
    .withConf({ lang: "en" })
    .withOptions({ addViewportTag: false })
    .on("idCheck.onStepCompleted", () => {
      document.getElementById("kycContinueBtn")?.classList.remove("hidden");
    })
    .on("idCheck.onApplicantSubmitted", () => {
      document.getElementById("kycContinueBtn")?.classList.remove("hidden");
    })
    .on("idCheck.onApplicantResubmitted", () => {
      document.getElementById("kycContinueBtn")?.classList.remove("hidden");
    })
    .on("idCheck.onError", (err) => {
      state.error = "Verification error: " + (err?.message || "Please try again.");
      renderStep();
    })
    .build();

  sdk.launch("#sumsubWebSdk");
}

function handleVerificationContinue() {
  goTo("proof-of-address");
  renderStep();
}

// ── Steps 3, 4: Document Uploads ──────────────────────────────────────────────
const uploadConfigs = {
  "proof-of-address": {
    label: "Proof of Address",
    desc: "Utility bill, government letter, or bank statement",
    note: "Document must show your full name and residential address, and be dated <strong style='color:var(--kyc-text-2)'>within the last 3 months</strong>.",
    stepNum: 3,
    icon: `<svg width="24" height="24" fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`,
    apiType: "proof_of_address",
    nextStep: "bank-statement",
    btnLabel: "Upload & Continue",
  },
  "bank-statement": {
    label: "Bank Statement",
    desc: "Recent statement showing transactions",
    note: "Must include your <strong style='color:var(--kyc-text-2)'>full name, account number, and transactions</strong>, and be dated within the last 3 months.",
    stepNum: 4,
    icon: `<svg width="24" height="24" fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`,
    apiType: "bank_statement",
    nextStep: "agreement",
    btnLabel: "Upload & Continue",
  },
};

const uploadState = { "proof-of-address": { file: null }, "bank-statement": { file: null } };

function renderUploadStep(container, stepId) {
  const cfg = uploadConfigs[stepId];
  const st  = uploadState[stepId];

  const div = document.createElement("div");
  div.className = "premium-card space-y-5";
  div.innerHTML = `
    <!-- Header -->
    <div style="display:flex;align-items:center;gap:1rem">
      <div style="width:48px;height:48px;border-radius:14px;background:var(--gradient-btn);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:var(--shadow-md)">
        ${cfg.icon}
      </div>
      <div>
        <div style="display:flex;align-items:center;gap:0.5rem">
          <h2 style="font-size:1rem;font-weight:700;color:var(--kyc-text);margin:0">${cfg.label}</h2>
          <span class="badge badge-primary">Step ${cfg.stepNum} of 5</span>
        </div>
        <p style="font-size:0.875rem;color:var(--kyc-muted);margin:0.25rem 0 0">${cfg.desc}</p>
      </div>
    </div>

    <!-- Note -->
    <div class="info-note"><p>${cfg.note}</p></div>

    <!-- Upload zone -->
    <div id="uploadZone_${stepId}" class="upload-zone-idle" style="cursor:pointer">
      <input id="uploadInput_${stepId}" type="file" accept=".pdf,.jpg,.jpeg,.png" style="display:none" />
      <div id="uploadZoneContent_${stepId}">
        ${renderUploadZoneContent(st.file, false)}
      </div>
    </div>

    <!-- Error -->
    <div id="uploadError_${stepId}" class="hidden"></div>

    <!-- Button -->
    <button id="uploadBtn_${stepId}" class="btn-primary" ${st.file ? "" : "disabled"}>
      ${cfg.btnLabel}
      <svg width="16" height="16" fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
    </button>`;

  container.appendChild(div);

  // Wire up upload zone
  const zone  = document.getElementById(`uploadZone_${stepId}`);
  const input = document.getElementById(`uploadInput_${stepId}`);

  zone.addEventListener("click", () => input.click());
  zone.addEventListener("dragover", e => { e.preventDefault(); zone.className = "upload-zone-dragging"; });
  zone.addEventListener("dragleave", () => { zone.className = st.file ? "upload-zone-filled" : "upload-zone-idle"; });
  zone.addEventListener("drop", e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(stepId, f); });
  input.addEventListener("change", e => { const f = e.target.files[0]; if (f) handleFileSelect(stepId, f); });

  document.getElementById(`uploadBtn_${stepId}`).addEventListener("click", () => handleUpload(stepId, cfg));
}

function renderUploadZoneContent(file, dragging) {
  if (file) {
    return `
      <div style="display:flex;flex-direction:column;align-items:center;gap:0.75rem">
        <div style="width:56px;height:56px;border-radius:16px;background:var(--kyc-success-light);display:flex;align-items:center;justify-content:center">
          <svg width="28" height="28" fill="none" stroke="var(--kyc-success)" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <div style="text-align:center">
          <p style="font-size:0.875rem;font-weight:600;color:var(--kyc-text);margin:0">${escHtml(file.name)}</p>
          <p style="font-size:0.75rem;color:var(--kyc-muted);margin:0.25rem 0 0">${formatFileSize(file.size)}</p>
        </div>
        <button type="button" onclick="this.closest('[id^=uploadZone_]') && clearUploadFile(this)" style="font-size:0.75rem;color:var(--kyc-muted);background:none;border:none;cursor:pointer;text-decoration:underline;min-height:unset">
          Choose a different file
        </button>
      </div>`;
  }
  return `
    <div style="display:flex;flex-direction:column;align-items:center;gap:0.75rem">
      <div style="width:56px;height:56px;border-radius:16px;background:var(--gradient-btn);display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-md)">
        <svg width="28" height="28" fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
      </div>
      <div style="text-align:center">
        <p style="font-size:0.875rem;font-weight:600;color:var(--kyc-text);margin:0">${dragging ? "Drop your file here" : "Click to upload or drag & drop"}</p>
        <p style="font-size:0.75rem;color:var(--kyc-muted);margin:0.375rem 0 0">Maximum file size: 10 MB</p>
      </div>
      <div style="display:flex;gap:0.5rem;margin-top:0.25rem">
        ${["PDF","JPG","PNG"].map(e=>`<span style="font-size:0.6875rem;font-weight:700;color:var(--kyc-muted);background:#fff;border:1px solid var(--kyc-border);padding:2px 8px;border-radius:6px">${e}</span>`).join("")}
      </div>
    </div>`;
}

function clearUploadFile(btn) {
  const zone = btn.closest(".upload-zone-idle, .upload-zone-filled, .upload-zone-dragging");
  if (!zone) return;
  const id = zone.id.replace("uploadZone_", "");
  uploadState[id].file = null;
  zone.className = "upload-zone-idle";
  document.getElementById(`uploadZoneContent_${id}`).innerHTML = renderUploadZoneContent(null, false);
  const uploadBtn = document.getElementById(`uploadBtn_${id}`);
  if (uploadBtn) uploadBtn.disabled = true;
}

function handleFileSelect(stepId, f) {
  const ACCEPTED = ["application/pdf","image/jpeg","image/png"];
  const MAX = 10 * 1024 * 1024;
  const errEl = document.getElementById(`uploadError_${stepId}`);

  if (!ACCEPTED.includes(f.type)) {
    showError(`uploadError_${stepId}`, "Only PDF, JPG, or PNG files are accepted.");
    return;
  }
  if (f.size > MAX) {
    showError(`uploadError_${stepId}`, "File size must be 10 MB or less.");
    return;
  }

  if (errEl) { errEl.innerHTML = ""; errEl.classList.add("hidden"); }
  uploadState[stepId].file = f;
  document.getElementById(`uploadZone_${stepId}`).className = "upload-zone-filled";
  document.getElementById(`uploadZoneContent_${stepId}`).innerHTML = renderUploadZoneContent(f, false);
  document.getElementById(`uploadBtn_${stepId}`).disabled = false;
}

async function handleUpload(stepId, cfg) {
  const f = uploadState[stepId].file;
  if (!f) return;

  const btn = document.getElementById(`uploadBtn_${stepId}`);
  setButtonLoading(btn, true, "Uploading...");
  clearError(`uploadError_${stepId}`);

  try {
    const form = new FormData();
    form.append("file", f);
    const res = await fetch(`/api/upload?documentType=${cfg.apiType}`, { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) { showError(`uploadError_${stepId}`, data.error || "Upload failed. Please try again."); setButtonLoading(btn, false); return; }
    goTo(cfg.nextStep);
    renderStep();
  } catch {
    showError(`uploadError_${stepId}`, "Network error. Please check your connection.");
    setButtonLoading(btn, false);
  }
}

// ── Step 5: Agreement ─────────────────────────────────────────────────────────
const agreementState = { file: null };

function renderAgreementStep(container) {
  const div = document.createElement("div");
  div.className = "premium-card space-y-5";
  div.innerHTML = `
    <!-- Header -->
    <div style="display:flex;align-items:center;gap:1rem">
      <div style="width:48px;height:48px;border-radius:14px;background:var(--gradient-btn);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:var(--shadow-md)">
        <svg width="24" height="24" fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
      </div>
      <div>
        <div style="display:flex;align-items:center;gap:0.5rem">
          <h2 style="font-size:1rem;font-weight:700;color:var(--kyc-text);margin:0">Agreement</h2>
          <span class="badge badge-primary">Step 5 of 5</span>
        </div>
        <p style="font-size:0.875rem;color:var(--kyc-muted);margin:0.25rem 0 0">Download, sign and upload the agreement</p>
      </div>
    </div>

    <!-- Step 1: download -->
    <div style="background:var(--kyc-bg-2);border:1px solid var(--kyc-border);border-radius:var(--radius-xl);padding:1rem">
      <p style="font-size:0.6875rem;font-weight:700;color:var(--kyc-muted);text-transform:uppercase;letter-spacing:0.07em;margin:0 0 0.625rem">Step 1 — Download & Sign</p>
      <p style="font-size:0.8125rem;color:var(--kyc-muted);margin:0 0 0.875rem;line-height:1.5">Download the agreement template, sign it, and upload the signed copy below.</p>
      <button id="downloadTemplateBtn" class="btn-secondary" style="max-width:200px">
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Download Template
      </button>
      <div id="downloadError" class="hidden" style="margin-top:0.5rem"></div>
    </div>

    <!-- Step 2: upload -->
    <div>
      <p style="font-size:0.6875rem;font-weight:700;color:var(--kyc-muted);text-transform:uppercase;letter-spacing:0.07em;margin:0 0 0.75rem">Step 2 — Upload Signed Copy</p>
      <div id="agreementZone" class="upload-zone-idle" style="cursor:pointer">
        <input id="agreementInput" type="file" accept=".pdf,.jpg,.jpeg,.png" style="display:none" />
        <div id="agreementZoneContent">${renderUploadZoneContent(null, false)}</div>
      </div>
    </div>

    <!-- Error -->
    <div id="agreementError" class="hidden"></div>

    <!-- Button -->
    <button id="agreementBtn" class="btn-primary" disabled>
      Complete Verification
      <svg width="16" height="16" fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    </button>`;

  container.appendChild(div);

  // Download button
  document.getElementById("downloadTemplateBtn").addEventListener("click", async () => {
    clearError("downloadError");
    try {
      const res = await fetch("/api/agreement/template");
      if (!res.ok) { showError("downloadError", "Agreement template not available. Please contact your agent."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "agreement_template.pdf"; a.click();
      URL.revokeObjectURL(url);
    } catch { showError("downloadError", "Failed to download template."); }
  });

  // Upload zone
  const zone  = document.getElementById("agreementZone");
  const input = document.getElementById("agreementInput");

  zone.addEventListener("click", () => input.click());
  zone.addEventListener("dragover", e => { e.preventDefault(); zone.className = "upload-zone-dragging"; });
  zone.addEventListener("dragleave", () => { zone.className = agreementState.file ? "upload-zone-filled" : "upload-zone-idle"; });
  zone.addEventListener("drop", e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleAgreementFile(f); });
  input.addEventListener("change", e => { const f = e.target.files[0]; if (f) handleAgreementFile(f); });
  document.getElementById("agreementBtn").addEventListener("click", handleAgreementUpload);
}

function handleAgreementFile(f) {
  const ACCEPTED = ["application/pdf","image/jpeg","image/png"];
  if (!ACCEPTED.includes(f.type)) { showError("agreementError","Only PDF, JPG, or PNG files are accepted."); return; }
  if (f.size > 10*1024*1024) { showError("agreementError","File size must be 10 MB or less."); return; }
  clearError("agreementError");
  agreementState.file = f;
  document.getElementById("agreementZone").className = "upload-zone-filled";
  document.getElementById("agreementZoneContent").innerHTML = renderUploadZoneContent(f, false);
  document.getElementById("agreementBtn").disabled = false;
}

async function handleAgreementUpload() {
  if (!agreementState.file) return;
  const btn = document.getElementById("agreementBtn");
  setButtonLoading(btn, true, "Uploading...");
  clearError("agreementError");

  try {
    const form = new FormData();
    form.append("file", agreementState.file);
    const res = await fetch("/api/upload?documentType=agreement", { method:"POST", body: form });
    const data = await res.json();
    if (!res.ok) { showError("agreementError", data.error || "Upload failed."); setButtonLoading(btn, false); return; }
    goTo("status");
    renderStep();
  } catch {
    showError("agreementError","Network error.");
    setButtonLoading(btn, false);
  }
}

// ── Status page ───────────────────────────────────────────────────────────────
function renderStatusStep(container) {
  const div = document.createElement("div");
  div.className = "premium-card space-y-5";
  const s = state.verificationStatus;
  const firstName = state.userData?.firstName || "there";

  let heroHtml = "";
  let actionHtml = "";

  const COMPLETED_STEPS = [
    {label:"Personal Details", desc:"Information verified"},
    {label:"Identity & Selfie", desc:"Document + liveness passed"},
    {label:"Proof of Address", desc:"Address confirmed"},
    {label:"Bank Statement", desc:"Statement reviewed"},
    {label:"Agreement", desc:"Signed document received"},
  ];

  if (s === "GREEN") {
    heroHtml = `
      <div class="status-hero">
        <div class="status-icon-wrap success" style="margin-bottom:1.25rem">
          <svg width="40" height="40" fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <div class="status-badge-dot">
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        </div>
        <h2 class="status-title">Identity Verified</h2>
        <p class="status-desc">Congratulations, <strong style="color:var(--kyc-text)">${escHtml(firstName)}</strong>! Your identity has been successfully verified.</p>
      </div>
      <div class="checklist">
        <p class="checklist-heading">All Steps Completed</p>
        ${COMPLETED_STEPS.map(st=>`
          <div class="checklist-item">
            <div class="checklist-check"><svg width="12" height="12" fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
            <div class="flex-1" style="min-width:0"><p class="checklist-label">${st.label}</p><p class="checklist-sublabel">${st.desc}</p></div>
            <span class="checklist-done">Done</span>
          </div>`).join("")}
      </div>`;
    actionHtml = `
      <button onclick="if(state.userData?.email)fetchUserStatus(state.userData.email)" class="btn-secondary">
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        Refresh
      </button>
      <div style="border-top:1px solid var(--kyc-border);padding-top:1.25rem;text-align:center;margin-top:0.5rem">
        <button onclick="handleStartNew()" style="font-size:0.875rem;color:var(--kyc-muted);background:none;border:none;cursor:pointer;transition:color 0.15s" onmouseover="this.style.color='var(--kyc-text)'" onmouseout="this.style.color='var(--kyc-muted)'">
          Start a new verification
        </button>
      </div>`;

  } else if (s === "processing" || s === "pending") {
    const isPending = s === "pending";
    heroHtml = `
      <div class="status-hero">
        <div class="status-icon-wrap processing" style="margin-bottom:1.25rem">
          ${isPending
            ? `<svg width="40" height="40" fill="none" stroke="var(--kyc-primary)" viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`
            : `<div style="width:40px;height:40px;border:3px solid rgba(29,78,216,0.25);border-top-color:var(--kyc-primary);border-radius:50%;animation:spin 1s linear infinite"></div>`}
        </div>
        <h2 class="status-title">${isPending ? "Awaiting Review" : "Under Review"}</h2>
        <p class="status-desc">${isPending
          ? "Your verification has been submitted and is awaiting review by our team."
          : "Our team is currently reviewing your submitted documents. This usually takes a few minutes."}</p>
      </div>
      <div class="trust-row">
        <div class="trust-dot">Encrypted</div>
        <div class="trust-dot">Secure</div>
        <div class="trust-dot">Private</div>
      </div>`;
    actionHtml = `
      <button onclick="if(state.userData?.email)fetchUserStatus(state.userData.email)" class="btn-secondary">
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        Refresh Status
      </button>`;

  } else if (s === "RED") {
    heroHtml = `
      <div class="status-hero">
        <div class="status-icon-wrap danger" style="margin-bottom:1.25rem">
          <svg width="40" height="40" fill="none" stroke="var(--kyc-danger)" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </div>
        <h2 class="status-title">Verification Not Approved</h2>
        <p class="status-desc">We were unable to verify your identity, ${escHtml(firstName)}. Please review your documents and try again.</p>
      </div>
      <div style="padding:0.875rem;background:var(--kyc-warning-light);border:1px solid rgba(217,119,6,0.25);border-radius:var(--radius-xl)">
        <p style="font-size:0.75rem;font-weight:600;color:var(--kyc-warning);margin:0 0 0.375rem">Common reasons for rejection:</p>
        <ul style="font-size:0.75rem;color:var(--kyc-muted);margin:0;padding:0;list-style:none">
          <li style="margin-bottom:3px">• Document image was blurry or poorly lit</li>
          <li style="margin-bottom:3px">• Document was expired or incomplete</li>
          <li>• Information did not match records</li>
        </ul>
      </div>`;
    actionHtml = `<button onclick="handleRetry()" class="btn-primary"><svg width="16" height="16" fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> Retry Verification</button>`;

  } else if (s === "RETRY") {
    heroHtml = `
      <div class="status-hero">
        <div class="status-icon-wrap warning" style="margin-bottom:1.25rem">
          <svg width="40" height="40" fill="none" stroke="var(--kyc-warning)" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        </div>
        <h2 class="status-title">Retry Required</h2>
        <p class="status-desc">Some documents need to be resubmitted. Please restart the verification process.</p>
      </div>`;
    actionHtml = `<button onclick="handleRetry()" class="btn-primary"><svg width="16" height="16" fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> Retry Verification</button>`;

  } else {
    heroHtml = `<div class="empty-state"><p class="empty-state-title">No verification record found.</p></div>`;
    actionHtml = `<button onclick="handleRetry()" class="btn-primary">Start Verification <svg width="16" height="16" fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button>`;
  }

  div.innerHTML = `${heroHtml}<div class="space-y-3" style="padding-top:0.5rem">${actionHtml}</div>`;
  container.appendChild(div);
}

// ── Action handlers ───────────────────────────────────────────────────────────
function handleRetry() {
  goTo("form");
  state.accessToken = null;
  state.verificationStatus = "RETRY";
  renderStep();
}

function handleStartNew() {
  localStorage.removeItem("kyc_user_email");
  state.step = "form"; state.accessToken = null; state.applicantId = null;
  state.userData = null; state.error = null; state.verificationStatus = null;
  // Reset form
  Object.keys(formData).forEach(k => formData[k] = "");
  Object.keys(formErrors).forEach(k => delete formErrors[k]);
  Object.keys(formTouched).forEach(k => delete formTouched[k]);
  renderStep();
}

async function handleLogout() {
  await fetch("/api/auth/contact/logout", { method:"POST" });
  window.location.href = "/login";
}
