# Sprint 010 Google Calendar — Linear Operator Runbook (PRODUCTION)

**One pass, in order, from credentials to a working Google token.** Every step that
needs a secret, the live server, or the Google Console is performed by the operator.
No step in this guide asks the agent to read a protected file or contact Google.

Status of the database stage (already done by the operator): migrations **#22–#25
applied** and verified — structure all-`1`, integrity all-`inv_*=0`.

> **Legend.** `[OPS]` = operator action on the server/Console. `[CHECK]` = confirm
> before continuing. `[STOP]` = do not continue; report.

---

## Step 1 — Secure the central Google account `[OPS]`

Account identity (no secret): `incubatorosapp@gmail.com`

1. Sign in to that Google account at `https://myaccount.google.com/`.
2. **Security → How you sign in → Password → change it.** Choose a strong unique
   password. Do **not** write it in any file, note, chat or document.
3. **Security → How you sign in → 2-Step Verification → turn on.** Prefer a
   **passkey** or an authenticator app over SMS.
4. Store the new password in your password manager only.

`[CHECK]` 2-Step Verification shows **On**; the old exposed password no longer works.

> **Why:** the old password was previously written in plaintext (`docs/0001notes.md`,
> gitignored, now redacted). Rotation is required. Incubator OS will connect to this
> account **only via OAuth** — the password is never entered into the app.

---

## Step 2 — Configure the production OAuth client `[OPS]`

Follow [`google-cloud-console-setup.md`](google-cloud-console-setup.md). In short:

1. Google Cloud Console → project `Incubator OS` (or create one).
2. **APIs & Services → Library →** enable **Google Calendar API**.
3. **OAuth consent screen:**
   - User type: **External**.
   - Scopes: `openid`, `email`,
     `https://www.googleapis.com/auth/calendar.events` (nothing wider).
   - While in **Testing**: add `incubatorosapp@gmail.com` as a **Test user**.
4. **Credentials → Create credentials → OAuth client ID:**
   - Application type: **Web application**.
   - **Authorized redirect URIs — add EXACTLY:**
     ```
     https://app.rbttacesd.co.za/api/api/google-calendar/commands/callback.php
     ```
     (If you also test locally, add
     `http://localhost:8080/api/api/google-calendar/commands/callback.php`.)
5. Copy the **Client ID** and **Client secret** — you will place them in Step 3.

`[CHECK]` Client type is **Web application**; the redirect URI matches **character
for character**; the app is a published/consented external app **or** in Testing with
the test user added.

> **7-day warning (repeat):** while the app is in **Testing**, the refresh token
> expires after **7 days**. The next sync then returns `invalid_grant`, the
> connection shows `needs_reconnect`, and you reconnect. This is expected until the
> app is verified. Plan verification before public use.

---

## Step 3 — Create `config/google.local.php` on the server `[OPS]`

> **DO NOT UPLOAD `config/google.local.php` from the repo — EVER.** It is the
> developer's **offline test** config (`use_fake => true`, placeholder
> `local-fake-client` credentials, a shared test AES key). If it lands on the
> server the app cannot reach real Google. **Create the file by hand on the server**
> (FileZilla → right-click → *Create new file*, or a cPanel File Manager), or edit
> it in place. This is the one file that must never come across from the local
> working tree.
>
> A guard now exists in `config/google.php`: if `use_fake => true` is present on a
> non-loopback host, the provider **fails closed** (`503
> GOOGLE_NOT_CONFIGURED`) instead of silently using the fake. That is a safety net,
> not a substitute for the correct file.

Create the file **on the server** at
`/api/config/google.local.php` (same folder as the committed `config/google.php`).

Copy the shape from `config/google.local.example.php` and fill in:

```php
<?php
declare(strict_types=1);

return [
    // From Step 2 (OAuth client ID / secret). NOT account passwords.
    'client_id'     => '<client id from Step 2>',
    'client_secret' => '<client secret from Step 2>',

    // A SEPARATE secret: base64 of 32 random bytes (AES-256).
    // Generate on any machine with PHP:
    //   php -r "echo base64_encode(random_bytes(32)), PHP_EOL;"
    'encryption_key' => '<base64 32-byte key>',

    // Do NOT include a `use_fake` key in production. (If present and true, the
    // provider fails closed on this host.)
    'key_version' => 1,
    'default_calendar_id' => 'primary',
];
```

`[CHECK]` Open
`https://app.rbttacesd.co.za/api/api/google-calendar/queries/connection.php` **logged
out** → `401` (route deployed). Logged **in** → `200` (not `503`) once this file is
valid. If it still returns `503 GOOGLE_NOT_CONFIGURED`, the file is missing/invalid,
the AES key is not a valid 32-byte base64 value, or `use_fake => true` is present.

> The encryption key **must differ** from the client secret. Never upload this file;
> never commit it; never paste its contents into a chat.

---

## Step 3b — Remediation: if the LOCAL `google.local.php` was uploaded `[OPS]`

**Symptom:** Connect sends the browser to `accounts.google.com` and Google shows
**"OAuth client was not found"** (or the connection endpoint returns `503`). The FTP
log shows `config/google.local.php` (≈427 bytes) uploaded from the repo.

**If this happened, do all of the following:**

1. **Delete** `/api/config/google.local.php` on the server.
2. **Delete** `/api/config/google.local.example.php` if it was uploaded (docs only;
   must not sit on the server).
3. **Create a fresh `/api/config/google.local.php`** by hand (Step 3) with the real
   OAuth client id/secret and a **newly generated** AES key:
   ```
   php -r "echo base64_encode(random_bytes(32)), PHP_EOL;"
   ```
   Do **not** reuse the shared local test key (`iH3yi0z…`) — it exists in every
   developer's working tree. No real token had been minted yet, so rotating the key
   now loses nothing.
4. **Re-upload `api-incubator-os/config/google.php`** (the committed loader, which
   now carries the fail-closed fake guard). It is a normal repo file and is safe to
   upload — unlike `google.local.php`.
5. **Do not** upload an `/api/config/error_log`. Never delete or edit server logs.
6. Re-run the check in Step 3.

> **Why a fresh key matters.** If a real refresh token were ever encrypted with the
> shared test key, anyone with that key and database access could decrypt it. No
> production token exists yet, so generating a new key now removes that risk
> entirely.

---

## Step 4 — Deploy the backend `[OPS]`

1. **Back up** the current production files this deploy touches (Step 3 of
   [`sprint-010-google-calendar-deployment.md`](sprint-010-google-calendar-deployment.md)):
   `api/capabilities/` (whole), `api/config/google.php` if present,
   `api/api/google-calendar/` if present, the touched `api/api/calendar/` and
   `api/api/sessions/` files, and the current Angular doc root.
2. Upload the **51 files** in Layer 1 → Layer 7 order from
   [`deployment/backend-manifest-sha256.md`](deployment/backend-manifest-sha256.md)
   §A2, using [`deployment/filezilla-upload-checklist.md`](deployment/filezilla-upload-checklist.md).
   - Production `/api/` root; `api-incubator-os/capabilities/...` → `/api/capabilities/...`;
     `api-incubator-os/api/...` → `/api/api/...`.
   - **Layer 6 files are existing files edited additively** (optional post-commit
     hook). They were backed up in sub-step 1.
   - **Only select the 51 manifest files.** Do **not** drag the whole
     `config/` folder — that uploads `config/google.local.php` (the local fake) and
     `config/google.local.example.php`. Both are forbidden on the server. Only
     `config/google.php` (the committed loader) is in the manifest.
   - Do **not** upload the `tests/` harness, `migrations/*.sql`, or `error_log`.
3. Verify SHA-256 after upload for a sample (or all) files.

> The commit `942e597` adds a fail-closed guard to the uploaded `config/google.php`:
> a `use_fake => true` on a non-loopback host now returns `503`, so even a mistaken
> local-config upload cannot silently run the fake. Still upload the correct files.

`[CHECK]`
- `GET .../api/google-calendar/queries/connection.php` logged out → `401`.
- Logged in → `200`.
- No endpoint returns a PHP fatal/include error.

`[STOP]` if any Google route returns `404` (files not landed) or a PHP fatal (missing
dependency), or if any response contains a token, `cipher`, `connectionId`, `etag` or
a claim token.

---

## Step 5 — Deploy the frontend `[OPS]`

1. Build (already produced): `dist/nodes/browser/` — **73 files** at commit
   `1638086`. See
   [`deployment/angular-manifest-sha256.md`](deployment/angular-manifest-sha256.md).
2. Upload the entire contents of `dist/nodes/browser/` into the Angular doc root,
   replacing the old bundle (back it up first).
3. Hard-refresh (Ctrl+F5).

`[CHECK]` All **73/73** files match the Angular manifest by SHA-256 (fetch from the
live site and hash). The Calendar page shows the **Your Google Calendar** chip.

---

## Step 6 — Obtain the Google token (connect) `[OPS]`

This is the step that creates the encrypted OAuth connection (the "token").

1. Sign in to production as the **designated admin** (the connection owner).
2. Open a company Calendar (or the global Calendar).
3. Click the **Your Google Calendar** chip → **Connect Google Calendar**.
4. If the app is in **Testing**, you will see Google's **"unverified app"** warning —
   click **Continue** (advanced) as the test user.
5. Sign in as `incubatorosapp@gmail.com` and **Allow** the calendar permission.
6. Google redirects back to the calendar; the safe result code `?google=connected` is
   handled, the chip reads **Google Calendar connected**, and it shows the account
   email. The connection row now holds **AES-256-GCM encrypted** tokens.

`[CHECK]`
- Chip: **Google Calendar connected** + `incubatorosapp@gmail.com`.
- `GET .../queries/connection.php` → `status: "connected"`, no token fields.
- Denied consent (`?google=denied`) and other codes never show a raw Google error.

`[STOP]` if `?google=account_mismatch`, `scope_missing`, `invalid` or `failed`, and
report the code (not any token).

---

## Step 7 — Smoke tests G0–G12 `[OPS]`

Run [`deployment/smoke-tests.md`](deployment/smoke-tests.md) section **G**. Use
disposable events named `ZZ-DEPLOY-CHECK-<date>`. The critical path:

| # | Do | Expect |
|---|---|---|
| G0 | connection.php logged in, credentials placed | `200`, no secrets |
| G1 | connection.php payload | no token/`connectionId` |
| G2 | Connect (Step 6) | connected chip + email; `?google=` stripped |
| G3 | Publish a **meeting** | confirm dialog (organiser, count, invites, Meet) → **In Google Calendar** + **Join Google Meet** + **Open in Google Calendar** |
| G4 | Publish a **non-meeting** | no Meet link; dialog says no attendees invited |
| G5 | Reschedule + reopen | **Changes not yet synced** → one **Sync changes** → up to date; repeat sync resends nothing |
| G6 | Edit the event in Google, then **Sync changes** | **Changed externally in Google Calendar**; only **Open Google Calendar**; local unchanged |
| G7 | **Remove from Google Calendar** | exact confirmation; local event retained; **Removed from Google Calendar** + **Add to Google Calendar again** |
| G8 | **Add to Google Calendar again** | republished with a **new** Google event id |
| G9 | Disconnect | exact warning; chip returns to **Connect**; Google events remain |
| G10 | As another user with event access | projection + Meet link visible, **no** management controls; direct `sync.php` → `403` |
| G11 | Inspect network for G2–G8 | no `ya29.`, `cipher`, `connectionId`, `etag`, claim token |
| G12 | DevTools console during G2–G8 | **zero** console errors |

`[CHECK]` all G-checks pass. `[STOP]` on any authorization leak, secret in a response,
or wrong-company event/invitation.

---

## Step 8 — Evidence, cleanup, close `[OPS]`

1. **Clean up:** use **Remove from Google Calendar** on each disposable
   `ZZ-DEPLOY-CHECK-*` event (or delete the local event). Do not remove a real user's
   mapping. If you used a throwaway connection, disconnect it.
2. **Record evidence:** the two post-migration SQL grids, the connection status
   payload (secret-free), the deployed `index.html` + `main-5GIR6EH3.js` SHA-256,
   the G0–G12 results, and any deviation.
3. **Send me the evidence grid** so I record the deployment in the runbook + session
   (as with Sprints 007–009) in one pass.

---

## Quick reference — endpoints

| Purpose | Path |
|---|---|
| Connection status | `GET <ApiBase>api/google-calendar/queries/connection.php` |
| Event projection | `GET <ApiBase>api/google-calendar/queries/event.php?id=` |
| Begin OAuth | `POST <ApiBase>api/google-calendar/commands/connect.php` |
| OAuth callback | `GET <ApiBase>api/google-calendar/commands/callback.php` |
| Disconnect | `POST <ApiBase>api/google-calendar/commands/disconnect.php` |
| Publish | `POST <ApiBase>api/google-calendar/commands/publish.php?id=` |
| Sync | `POST <ApiBase>api/google-calendar/commands/sync.php?id=` |
| Remove | `POST <ApiBase>api/google-calendar/commands/unpublish.php?id=` |

## Hard stops (any of these → stop and report)

Token/cipher/secret in a response or log · `connectionId`/`etag`/claim token exposed ·
a non-owner able to publish/sync/remove another organiser's mapping · Google events or
invitations created for the wrong company/Session · a `404` on a Google route after
upload · a PHP fatal on any Google endpoint · `503` that persists after a valid
`config/google.local.php`.
