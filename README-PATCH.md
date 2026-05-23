# Phase 2 — Password Flow Patch

Drops the avatar-menu password change + login-screen "Forgot password?" into
the SecureVerify KYC portal. Implements options **A + E** from the Phase 1
prototype.

## How to apply (drag-and-drop)

This folder mirrors your `sumsub_kyc/` layout exactly. To install:

1. **Copy this entire folder over your project**, overwriting all conflicts.
   On macOS/Linux:
   ```bash
   # From the parent of your sumsub_kyc/ folder
   cp -R phase2/sumsub_kyc/* sumsub_kyc/
   ```
   On Windows: extract the zip, then drag the `sumsub_kyc` folder onto your
   existing `sumsub_kyc` folder and choose "Replace files in destination."

2. **Run the cleanup script once** to delete the four obsolete files that the
   patch leaves orphaned (the Settings page + its JS):
   ```bash
   cd sumsub_kyc
   bash cleanup-old-files.sh
   rm cleanup-old-files.sh   # tidy up
   ```

3. **Restart the server**:
   ```bash
   npm start
   ```

That's it. The new `password_reset_requests` table is created automatically on
first DB access — no migration step needed.

---

## What's in the patch

**New files**
- `scripts/reset-admin.js`             — CLI break-glass recovery
- `public/js/user-menu.js`             — avatar popover + change-pw modal
- `public/js/forgot-password.js`       — login-screen link + modal

**Modified files**
- `package.json`                       — adds `reset-admin` npm script
- `src/lib/db.js`                      — new `password_reset_requests` table + helpers
- `src/routes/auth.js`                 — `POST /api/auth/<role>/forgot-password`
- `src/routes/admin.js`                — pending-reset surfacing
- `src/routes/agent.js`                — same, scoped to the agent's contacts
- `src/server.js`                      — stale `/settings` URLs now redirect to dashboard
- `public/css/styles.css`              — Phase 2 styles appended to the bottom
- `public/js/admin-agent.js`           — "Reset requested" banner
- `public/js/admin-contact.js`         — "Reset requested" banner
- `public/js/agent-contact.js`         — "Reset requested" banner
- All 6 dashboard HTMLs                — Settings nav link removed; user-menu.js loaded
- All 3 login HTMLs                    — forgot-password.js loaded

The existing `/api/admin/profile/password` and `/api/agent/profile/password`
endpoints **stay** — they're what the new popover modal calls.

---

## How to use the new pieces

### Change my password (signed-in admin or agent)

1. Click the avatar pill at the bottom of the sidebar.
2. Click **Change password**.
3. Enter current + new + confirm. Submit.

### Forgot password (anyone on a login page)

1. Click **Forgot password?** next to the Password label.
2. Enter your email (admin can also enter username).
3. A `password_reset_requests` row is inserted; the admin or agent who can
   act on it sees a banner on that user's detail page in their dashboard.

The user is told the request was received regardless of whether the email
matched — this is deliberate. Account-enumeration attacks rely on different
responses for known vs unknown emails; we avoid that.

### Admin self-recovery (CLI)

On the server, in the project directory:

```bash
npm run reset-admin <username>
```

Example:

```
$ npm run reset-admin admin

  ┌──────────────────────────────────────────────────────────┐
  │  ADMIN PASSWORD RESET                                    │
  ├──────────────────────────────────────────────────────────┤
  │  Username:        admin                                  │
  │  Temporary pw:    7Hx9-q2Lm-K4pR-9bcD                    │
  │                                                          │
  │  Sign in with this password, then immediately change it  │
  │  via the user menu (avatar pill, bottom-left).           │
  └──────────────────────────────────────────────────────────┘

  This reset has been recorded in the audit log.
```

Sign in with the temp password and immediately rotate it via the popover.

The reset writes an `audit_logs` row with `actor_type = 'cli'` so you can
distinguish CLI-driven resets from in-app password changes in the database
viewer (`/admin/dashboard/database`).

#### Cloud-host variants

| Host type | How to run |
|---|---|
| Plain VPS (DigitalOcean, Hetzner, AWS EC2…) | `ssh user@host`, `cd /path/to/app`, `npm run reset-admin <username>` |
| Docker | `docker exec -it <container> npm run reset-admin <username>` |
| Render / Railway / Fly.io | Use the platform's shell — `fly ssh console`, Railway shell, Render web shell. Same command once in. |
| PM2 | Same as VPS. PM2 just supervises; the script runs as a sibling Node process. |

You do **not** need to stop the app. SQLite WAL mode handles concurrent reads
and writes between the running server and the CLI script.

---

## Schema added

```sql
CREATE TABLE IF NOT EXISTS password_reset_requests (
  id TEXT PRIMARY KEY,
  user_type TEXT NOT NULL,             -- 'admin' | 'agent' | 'contact'
  submitted_email TEXT NOT NULL,
  matched_user_id TEXT,                -- nullable for unknown-email submissions
  matched_agent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT,
  resolved_by TEXT
);
```

Rows flip from `pending` → `resolved` automatically when an admin or agent
uses the existing reset-password endpoint for the matched user. No
auto-cleanup; if you want to prune resolved requests older than 30 days,
run a periodic cron with:

```sql
DELETE FROM password_reset_requests WHERE status = 'resolved' AND resolved_at < datetime('now', '-30 days');
```

---

## Smoke-test checklist

After applying the patch, walk through this once:

- [ ] `/admin/login` — "Forgot password?" link visible next to Password label
- [ ] Click it → modal opens → submit → success state with CLI hint
- [ ] Same for `/agent/login` and `/login`
- [ ] Sign in as admin → avatar pill bottom-left → click it → popover opens
- [ ] Click **Change password** → modal → wrong current pw → see error
- [ ] Enter correct current + valid new + confirm → success
- [ ] **Settings** is no longer in the sidebar nav
- [ ] Same for agent dashboard
- [ ] On a user detail page where you submitted a forgot-password request →
  "Password reset requested" banner appears at the top
- [ ] Click **Reset now** → existing reset modal → set new pw → banner clears
- [ ] On the server: `npm run reset-admin admin` → temp pw printed → sign in
  with it → immediately rotate via popover

---

## What's intentionally NOT included

- **SMTP / magic-link recovery** — left out per design conversation; the
  admin-mediated chain (Contact → Agent → Admin → CLI) covers it without new
  infra.
- **Active sessions list** — removed from the popover for now. Reintroduce
  when you want a SOC 2 sessions surface.
- **2FA** — out of scope. The change-pw modal has room to grow into this.
- **Auto-expiry of stale reset requests** — see the SQL snippet above.
