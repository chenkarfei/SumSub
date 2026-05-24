document.getElementById("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const email    = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const btn = document.getElementById("loginBtn");
  const errDiv = document.getElementById("loginError");

  errDiv.innerHTML = ""; errDiv.classList.add("hidden");
  setButtonLoading(btn, true, "Signing in…");

  try {
    const res = await fetch("/api/auth/contact/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      errDiv.innerHTML = `<div class="login-error">${escHtml(data.error || "Login failed")}</div>`;
      errDiv.classList.remove("hidden");
      setButtonLoading(btn, false);
    } else {
      window.location.href = "/";
    }
  } catch {
    errDiv.innerHTML = `<div class="login-error">Network error. Please try again.</div>`;
    errDiv.classList.remove("hidden");
    setButtonLoading(btn, false);
  }
});

async function checkContactSession() {
  const res = await fetch("/api/auth/contact/heartbeat", { method: "POST" }).catch(() => null);
  if (res?.ok) window.location.replace("/");
}
checkContactSession();
window.addEventListener("pageshow", e => { if (e.persisted) checkContactSession(); });
