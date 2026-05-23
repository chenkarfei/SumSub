/* Agent Login */

(async function checkSession() {
  const res = await fetch("/api/agent/me").catch(() => null);
  if (res && res.ok) window.location.href = "/agent/dashboard";
})();

document.getElementById("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const btn      = document.getElementById("loginBtn");
  const errDiv   = document.getElementById("loginError");

  errDiv.innerHTML = ""; errDiv.classList.add("hidden");
  setButtonLoading(btn, true, "Signing in…");

  try {
    const res  = await fetch("/api/auth/agent/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      errDiv.innerHTML = `<div class="login-error">${escHtml(data.error || "Login failed")}</div>`;
      errDiv.classList.remove("hidden");
      setButtonLoading(btn, false);
    } else {
      window.location.href = "/agent/dashboard";
    }
  } catch {
    errDiv.innerHTML = `<div class="login-error">Network error. Please try again.</div>`;
    errDiv.classList.remove("hidden");
    setButtonLoading(btn, false);
  }
});
