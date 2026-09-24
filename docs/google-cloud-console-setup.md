# Google Cloud Console setup & OAuth verification — Sprint 010

This is the operator runbook for the **central Google account** that Incubator OS
publishes through. It covers the OAuth client, the exact redirect URIs, the scope
set, the production/verification path, and the **7-day refresh-token expiry** that
applies while the app is in **Testing** mode.

> **Operating model.** One designated Incubator OS admin/service user owns the
> connection. The account is connected **only through OAuth** — nobody types its
> password into Incubator OS. Enable **2FA / a passkey** and keep the password out
> of any file or message. See
> [google-calendar-api.md](google-calendar-api.md), "Connection ownership model".

**No credential value belongs in this document, in source control, or in a chat
message.** The client secret and the AES key live only in
`config/google.local.php` on the server (gitignored) or in environment variables.

---

## 1. Project and OAuth client

1. In the [Google Cloud Console](https://console.cloud.google.com/), create (or
   select) a project, e.g. `Incubator OS`.
2. **APIs & Services → Library** → enable **Google Calendar API**.
3. **APIs & Services → OAuth consent screen**:
   - User type: **External** (unless the central account is Workspace-managed and
     you are using Internal).
   - App name, support email, developer contact.
   - **Scopes**: add exactly the set below.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**.
   - Name: e.g. `Incubator OS web`.
   - **Authorized redirect URIs**: add the exact values in section 2.
5. Copy the **Client ID** and **Client secret** into the server config (section 5).

> The OAuth client type **must** be *Web application*. Other client types cannot
> use a server-side redirect URI and cannot hold a client secret safely.

---

## 2. Exact redirect URIs

The redirect URI is derived from `APP_URL`:

```
{APP_URL}/api/api/google-calendar/commands/callback.php
```

Register the URI(s) that match every environment that will run the flow:

| Environment | `APP_URL` | Redirect URI to register |
| --- | --- | --- |
| Production | `https://app.rbttacesd.co.za` | `https://app.rbttacesd.co.za/api/api/google-calendar/commands/callback.php` |
| Local (dev) | `http://localhost:8080` | `http://localhost:8080/api/api/google-calendar/commands/callback.php` |

- The match must be **exact** — scheme, host, path and the doubled `api/api` all
  matter. Google rejects any URI that is not registered verbatim.
- The value comes **only** from server configuration (`config/app.php` →
  `google_redirect_uri()`). Incubator OS never accepts a redirect URI from the
  browser.
- If you force a specific origin, set the `APP_URL` environment variable; do not
  edit the derived path.

---

## 3. Scope set (least privilege)

Locked in `capabilities/google-calendar/Contracts/GoogleScopes.php`:

| Scope | Why |
| --- | --- |
| `openid` | Identify the account. |
| `email` | Read the connected account's email (shown to the user). |
| `https://www.googleapis.com/auth/calendar.events` | Create/update/delete events and their Meet conference; send invitations. |

- `calendar.events` is a **sensitive scope** (it can modify a user's calendar).
- The connect flow requests `access_type=offline` + `prompt=consent` so a refresh
  token is issued for background-free, user-present publishing.
- No broader scope (`calendar`, `calendar.readonly`) is requested — do not add one
  to "make it work".

---

## 4. Testing mode vs Production (the verification path)

### Testing mode (today) — the **7-day refresh-token expiry**

While the OAuth consent screen is in **Testing**:

- Only accounts added as **Test users** can complete the flow. Add the central
  account and any operator account that will run the manual E2E.
- **A refresh token issued while the app is in Testing expires after 7 days.**
  After that the next sync returns `invalid_grant`, Incubator OS moves the
  connection to `needs_reconnect`, and the operator must reconnect. This is
  **expected**, not a bug — it is why the UI has a clear reconnect path and why
  this warning is repeated in the deployment runbook.
- Because of the 7-day expiry, **reconnect before relying on scheduled
  publishing**, and treat `needs_reconnect` as routine until the app is verified.

### Production (before public use) — app verification

To serve users beyond the test list and to stop the 7-day expiry, the app must be
**published** and pass Google verification:

1. Complete the OAuth consent screen (app name, logo, homepage, privacy policy,
   terms) and **publish** the app.
2. Because `calendar.events` is **sensitive**, Google requires **app
   verification** (brand + scope review). Non-verified apps show an "unverified
   app" warning and are capped on user count.
3. Verification has **lead time** (Google review can take days to weeks). Start it
   well before the public launch; do not schedule a launch that depends on it
   without buffer.
4. If the central account belongs to a Google Workspace domain and only internal
   users need it, consider **Internal** user type instead — it avoids the sensitive
   -scope review but limits the app to that domain.

> **Do not use the app publicly while unverified.** Until verification completes,
> keep it in Testing with the central account as a test user and accept the 7-day
> reconnect cadence.

---

## 5. Placing the credentials on the server

1. On the server, create `config/google.local.php` (same folder as the committed
   `config/google.php`; **gitignored**, never uploaded from source control).
   Copy the shape from `config/google.local.example.php` and fill in:
   - `client_id` — the OAuth client ID.
   - `client_secret` — the OAuth client secret.
   - `encryption_key` — **a separate secret**: `base64(random_bytes(32))`.
     Generate with:
     ```powershell
     php -r "echo base64_encode(random_bytes(32)), PHP_EOL;"
     ```
   - `key_version` — `1` (increment only during a planned key rotation).
   - `default_calendar_id` — `primary`.
2. Ensure the file is not web-readable as a raw document and is excluded from
   backups that leave the server. (A safe read-only check: the file simply must
   not appear in any source-control diff and must not be served; never probe
   protected server files over HTTP.)
3. **Fails closed:** if any value is missing or the AES key is not a valid
   32-byte base64 value, every Google endpoint returns
   `503 GOOGLE_NOT_CONFIGURED`. A half-configured server never accepts a connection.

### Key rotation (future)

The AES key version is stored per ciphertext. To rotate:

1. Generate a new 32-byte key, increment `key_version`.
2. Add the new key to the loader so both keys are available during the transition,
   re-encrypt stored connections, then retire the old key.
3. This is a planned maintenance action with its own change record — not part of
   the initial deploy.

---

## 6. Connect and verify (operator)

1. Sign in to Incubator OS as the **central account owner** (the designated admin).
2. On the Calendar header, open **Your Google Calendar** → **Connect Google Calendar**.
3. Complete consent in Google. You are returned to the calendar; the chip reads
   **Google Calendar connected** and shows the account email.
4. Publish one disposable `ZZ-DEPLOY-CHECK-*` meeting event and confirm a Meet link
   and (if the Session has participants) invitations. See
   [`deployment/smoke-tests.md`](deployment/smoke-tests.md), section G.

---

## 7. Checklist (copy into the deployment log)

- [ ] Calendar API enabled in the project.
- [ ] OAuth client type = **Web application**.
- [ ] Redirect URIs registered exactly (prod + local if used).
- [ ] Consent screen scopes = `openid`, `email`, `calendar.events` only.
- [ ] Test user(s) added while in Testing.
- [ ] Central account has **2FA / passkey** enabled; password rotated and not
      stored anywhere (see `docs/0001notes.md`).
- [ ] `config/google.local.php` created on the server with all four secrets;
      `google_configured()` true; a missing secret returns `503`.
- [ ] **7-day Testing refresh-token expiry** understood and communicated.
- [ ] App-verification lead time planned before public launch.
- [ ] Reconnect path exercised (`needs_reconnect` → Reconnect).
