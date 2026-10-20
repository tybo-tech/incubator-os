# Incident 001 — Open mail relay and committed credentials

> **Severity**: High
> **Status**: **Open — operator action required before Sprint 014**
> **Discovered**: 2026-10-20, during the Discovery-013-016 codebase audit
> **Affected**: `api-incubator-os/mail/` (deployed at `mail.rbttacesd.co.za`) and
> `api-incubator-os/config/Database.php`
> **Fix owner**: operations (rotation, endpoint restriction) + engineering (proxy, escaping)

This file deliberately contains **no secret values**. Do not paste passwords, tokens or connection
strings into this file, tickets, chat or logs.

---

## 1. What is exposed

### 1.1 The mail endpoint is an unauthenticated relay

`api-incubator-os/mail/` is a **self-contained mini-app**, not part of the main API. It has its own
`config/` (`headers.php`, `Connection.php`) and its own `vendor/` (PHPMailer), and it is deployed to a
**different host** than the API:

```
Browser  ──POST──> https://mail.rbttacesd.co.za/send.php   (no authentication)
```

Evidence:

- `src/services/email/email.service.ts` defines
  `const API_URL = 'https://mail.rbttacesd.co.za/send.php';` and is called **directly from the
  browser**.
- `api-incubator-os/mail/send.php` requires `config/headers.php` and `vendor/autoload.php`
  **relative to `mail/`**; `api-incubator-os/vendor/` does not exist.
- `api-incubator-os/mail/config/headers.php` returns `Access-Control-Allow-Origin: *`.
- `send.php` performs **no authentication, no authorisation and no rate limiting**. It accepts
  `recipient_email`, `recipient_name`, `subject` and a raw HTML `message` from the request body, and
  force-BCCs `accounts@tybo.co.za` on every send.

### 1.2 Credentials are committed to git

The SMTP password is hardcoded in `api-incubator-os/mail/send.php` and the file is tracked by git.
A production database password is likewise hardcoded in `api-incubator-os/config/Database.php` and
tracked. **Both must be treated as compromised.**

Removing them from the working tree is not enough; the values remain in git history. Rotation is the
only effective remediation.

### 1.3 Escaping is dead code

`send.php`'s `format_email()` does:

```php
$message = htmlspecialchars($data->message);
$message = $data->message;          // immediately discards the escaping
```

Because the endpoint is unauthenticated, an attacker can inject arbitrary HTML (phishing content,
tracking pixels, spoofed branding) into a message sent from the organisation's own domain.

---

## 2. Impact

- **Reputation and deliverability**: anyone can send spam/phishing through the organisation's SMTP
  account and domain. This can get the domain blocklisted and break all transactional email.
- **Quota and cost**: unbounded sends consume the mailbox quota and may incur provider limits.
- **Phishing**: attacker-controlled recipient, subject and body, sent from a trusted domain, with a
  BCC copy to the organisation — a credible phishing primitive.
- **Credential compromise**: the SMTP and production DB passwords are in git history. Anyone with
  repository access (or a leaked clone/backup) has them.
- **Data exposure (DB)**: the committed DB credentials allow direct database access if the host is
  reachable.

---

## 3. Immediate actions (operations)

Do these **before** Sprint 014 starts. They are not code changes.

- [ ] **Rotate the SMTP password** for the sending account. Update the value only in the mail host's
  server-side config (see §4), never in the repository.
- [ ] **Rotate the production database password.** Update `api-incubator-os/config/Database.php`
  **on the server only** (it is already on the never-upload list).
- [ ] **Confirm the old credentials no longer work** (SMTP auth fails; DB connection with the old
  password fails).
- [ ] **Restrict the mail endpoint** at the host/firewall if possible: allow only the API host's
  outbound IP, or require a shared secret (engineering task 4.1). At minimum, block browser-origin
  access.
- [ ] **Audit recent mail logs** for unexpected recipients, volumes or subjects; preserve evidence.
- [ ] **Check blocklist status** for the sending domain and IP.
- [ ] **Search the working tree** for any other committed secrets and record them here (paths only,
  no values): `git grep -n -I -E "password|secret|api[_-]?key|token" -- '*.php' '*.ts' '*.json'`
  (review hits manually; many will be legitimate field names).

---

## 4. Engineering remediation

The correct shape is **API → mail host**, never **browser → mail host**.

- [ ] **4.1** Add a shared-secret header requirement to `api-incubator-os/mail/send.php` and a
  recipient allow-list (company contact addresses plus explicitly permitted staff addresses).
- [ ] **4.2** Move SMTP settings into `api-incubator-os/mail/config/mail.php` (the mail app's own
  `config/`), which is server-only and **never uploaded**. Do not place it under the API's `config/` —
  the mail app cannot read that tree.
- [ ] **4.3** Add rate limiting per sender/recipient and a maximum body size.
- [ ] **4.4** Create an authenticated API endpoint
  (`api/notifications/commands/send-email.php`) that:
  - requires a session for staff-initiated sends and enforces company/scope access;
  - exposes a narrow, rate-limited public path for password reset only (fixed template, known user);
  - calls the mail host server-to-server with the shared secret;
  - never returns SMTP errors verbatim to the client.
- [ ] **4.5** Replace every direct `EmailService` → `mail.rbttacesd.co.za` call with the API endpoint.
  Inventory first: password reset, financial-indicator request dialog, and any other caller.
- [ ] **4.6** Fix `format_email()` to escape exactly once and keep intentional HTML; make the BCC
  configurable.
- [ ] **4.7** Add `api-incubator-os/mail/` and its `config/` to the never-upload list in
  `docs/sprint-007-009-production-deployment.md`.
- [ ] **4.8** Add a regression test: a request without the shared secret is rejected; a `<script>`
  payload is inert; an unlisted recipient is refused.

---

## 5. Verification

- [ ] `curl` from an unrelated host to `send.php` without the secret returns `401/403` and sends
  nothing.
- [ ] A browser-origin `POST` from a different origin is rejected (CORS alone is not the control; the
  shared secret is).
- [ ] The API proxy sends successfully for an authorised staff user.
- [ ] An HTML/script payload renders as text in the received email.
- [ ] The old SMTP and DB credentials are confirmed dead.
- [ ] No secret string exists in the working tree (`git grep` review) and rotation is recorded in the
  operations log.
- [ ] `api-incubator-os/mail/` and `api-incubator-os/config/Database.php` are both on the never-upload
  list.

---

## 6. Notes

- **Rewriting git history is optional and not sufficient.** Rotation is mandatory; history rewriting
  only reduces future exposure and must not be treated as the fix.
- **Do not** test the live endpoint with probing requests beyond the verification above. Use an
  authorised test recipient.
- Sprint 014 Phase 1 depends on this incident being closed; see
  [`Sprint-014.md`](Sprint-014.md) tasks 1.10–1.14.
