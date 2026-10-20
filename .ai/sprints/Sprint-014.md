# Sprint 014 — Entrepreneur Self-Service (secure links, drafts and review)

> **Program**: Incubator OS — ESD / B-BBEE beneficiary support
> **Status**: Draft — ready for implementation after Sprint 013 and Discovery decision D3
> **Baseline**: `main` @ `4163b03`
> **Depends on**: **Sprint 013** (profile fields, offerings, revisions, completeness)
> **Duration**: Multi-phase (6 phases, sequential execution)
> **Previous work (locked capabilities)**: financial indicator request links (`nodes` type
> `financial_indicator_request`), `/financial/:token` public submission, `mail/send.php`,
> `EmailService`, Company profile capability, `AuthGuard`.

---

## Objective

Let an entrepreneur **complete or refresh their own company information** from a phone, without a
coach retyping it — and without letting a link overwrite facts the coach has verified.

This sprint delivers:

1. **A generic submission-link capability** — secure, scoped, expiring, revocable, auditable — that
   replaces the financial-only, node-based request mechanism for new work.
2. **A public submission screen** at `/submit/:token` that renders the scope it was issued for.
3. **A resumable profile form** — the entrepreneur can save progress and return until they submit.
4. **A review queue** — every submission becomes a change set with a field-level diff; an authorised
   user applies or rejects it, and applying writes a profile revision.
5. **Request management** — send, resend, copy, revoke, and see status (sent / opened / submitted /
   applied) from the company Profile tab.
6. **Safe email delivery** — links are sent by the backend, tokens are stored hashed, and mail
   credentials leave the source tree.

---

## Existing Foundation (Locked)

- **`capabilities/financial-indicators`** — stays the owner of financial indicator capture. This
  sprint reuses its *link pattern*, not its repository. Existing `nodes` request rows stay readable.
- **`/financial/:token`** — must keep working for links already sent. Do not break or redirect it.
- **`helpers/AuthGuard.php`** — for authenticated endpoints. Public endpoints must **not** call
  `auth_require_user`; they validate a token instead.
- **`helpers/Session.php`** — session handling for staff endpoints.
- **`core/Infrastructure/TransactionManager.php`** — every command is transactional.
- **Company capability** — `UpdateProfile`, `CompanyProductRepository`, `ProfileRevisionRepository`,
  `ProfileCompleteness` from Sprint 013. Submissions propose; these commands apply.
- **`mail/send.php` + `EmailService`** — existing delivery path. Harden it; do not build a second
  mailer.
- **Angular public routes** — `src/app/public/*` pattern (`public-form`, `public-financial-submission`),
  no `AppShell`, no auth guard.
- **Design system** — `.sw-*` cards, `app-icon`, ZAR formatting.

---

## Business Capabilities

| Capability | Introduces / Extends |
| --- | --- |
| Submission links | **Introduces** — generic scoped token, expiry, revoke, usage limits, audit |
| Submission drafts | **Introduces** — resumable, autosaved payload per link |
| Public submission screen | **Introduces** — `/submit/:token`, scope-driven form, explicit states |
| Profile submission | **Introduces** — entrepreneur-completed profile + offerings |
| Submission review | **Introduces** — field-level diff, conflicts, apply/reject |
| Request management | **Introduces** — send/resend/copy/revoke and status tracking in the Profile tab |
| Email delivery | **Extends** — backend-sent links, configurable credentials, authenticated generic endpoint |
| Financial link compatibility | **Extends** — legacy `/financial/:token` remains; new links use the generic capability |

---

## Domain Model

```
companies ──1:N── submission_links ──1:0..1── submission_drafts
                        │
                        └──1:N── submission_changes ──0:1── company_profile_revisions
                                        │
                                        └── applied fields update companies
                                            and company_products_services
```

### Collections

| Collection | Owner | Key fields |
| --- | --- | --- |
| `submission_links` | `capabilities/submissions` | `id` BIGINT, `tenant_id` INT default 1, `company_id` INT FK, `scope` `ENUM('profile','financial','evidence','annual_review')`, `token_hash` CHAR(64) UNIQUE, `token_last4` CHAR(4), `status` `ENUM('active','submitted','expired','revoked')` default `active`, `expires_at` DATETIME, `max_uses` INT default 1, `uses` INT default 0, `sent_to_email` VARCHAR(255) NULL, `sent_at` DATETIME NULL, `first_opened_at` DATETIME NULL, `submitted_at` DATETIME NULL, `revoked_at` DATETIME NULL, `created_by` INT NULL, `base_snapshot_json` JSON NULL, `metadata_json` JSON NULL, timestamps |
| `submission_drafts` | `capabilities/submissions` | `id` BIGINT, `link_id` BIGINT FK **UNIQUE**, `payload_json` JSON, `payload_bytes` INT, `last_saved_at` DATETIME, `save_count` INT default 0 |
| `submission_changes` | `capabilities/submissions` | `id` BIGINT, `link_id` BIGINT FK, `company_id` INT FK, `scope` VARCHAR(32), `status` `ENUM('pending','applied','rejected','conflict')` default `pending`, `submitted_payload_json` JSON, `diff_json` JSON, `conflict_json` JSON NULL, `submitted_at` DATETIME, `reviewed_by` INT NULL, `reviewed_at` DATETIME NULL, `applied_at` DATETIME NULL, `rejection_reason` VARCHAR(500) NULL, `applied_revision_no` INT NULL |

All three tables carry `tenant_id` where company-scoped and a `created_at`/`updated_at` pair.

### Lookup Collections

| Lookup | Values | Source |
| --- | --- | --- |
| `scope` | `profile`, `financial`, `evidence`, `annual_review` | enum column |
| link `status` | `active`, `submitted`, `expired`, `revoked` | enum column |
| change `status` | `pending`, `applied`, `rejected`, `conflict` | enum column |
| diff item `status` | `same`, `changed`, `added`, `removed`, `conflict` | computed, not stored as an enum column |

`financial`, `evidence` and `annual_review` scopes are **reserved**: Phase 1–5 implement `profile`
end-to-end; the other scopes must return a clear "not available yet" state rather than a broken form.
The financial scope may be wired to the existing indicator form in Phase 6 if time allows; otherwise
it stays with `/financial/:token`.

### Collection Links

| Link | Kind | Cascade |
| --- | --- | --- |
| `submission_links.company_id` → `companies.id` | FK | `ON DELETE CASCADE` |
| `submission_drafts.link_id` → `submission_links.id` | FK, UNIQUE | `ON DELETE CASCADE` |
| `submission_changes.link_id` → `submission_links.id` | FK | `ON DELETE CASCADE` |
| `submission_changes.company_id` → `companies.id` | FK | `ON DELETE CASCADE` |
| `submission_changes.applied_revision_no` → `company_profile_revisions.revision_no` | logical only | not an FK |

### Invariants

1. A link belongs to **exactly one** company and **exactly one** scope. It can never read or write
   another company.
2. The raw token is **never stored**. Only `SHA-256(token)` and the last 4 characters are persisted.
   The raw token exists in the generated URL and the sent email only.
3. Tokens are 256-bit random, URL-safe, at least 32 characters. Comparison is constant-time.
4. A link is usable only while `status='active'` and `expires_at > NOW()`. Expiry is evaluated
   server-side on every request; it is never trusted from the client.
5. `uses` is incremented atomically on submit; `uses >= max_uses` closes the link
   (`status='submitted'`).
6. A **profile** link is resumable: drafts are saved until expiry, and *submitting* consumes the
   link. A **financial** link keeps the legacy single-use, 7-day behaviour.
7. Default expiry: profile links **14 days**, financial links **7 days**. An override is allowed only
   up to 30 days and is recorded in `metadata_json`.
8. A submission **never writes to `companies` or `company_products_services` directly**. It creates a
   `submission_changes` row with `status='pending'`.
9. Applying a change is explicit, authorised, and transactional: it updates the profile, writes
   exactly one `company_profile_revisions` row with `source='submission_apply'`, and marks the change
   `applied`.
10. **Conflict rule.** `base_snapshot_json` is captured when the link is created. If a field the
    submission changes has a different current value than the base, that field is marked `conflict`
    and cannot be applied until the reviewer chooses the submission value or the current value.
    A conflict blocks a blind "apply all".
11. A draft payload is capped at **64 KB**; an oversized payload returns `413` and is not saved.
12. Expired, revoked, used and unknown tokens produce **distinguishable user-facing states** but
    **indistinguishable server errors** (no enumeration of company names, no stack traces).
13. Opening, saving, submitting, applying and rejecting are all appended to an access/audit trail.
14. Personal data (email, ID numbers) is never written to PHP error logs; IPs are stored hashed.
15. Emails are sent only to the company's stored `email_address` or an explicitly confirmed
    override; every send records the recipient and the actor.

---

## Architecture Decisions

- **New capability: `capabilities/submissions`.** It owns links, drafts, changes and review. It calls
  the Company capability to apply an accepted change; it never duplicates profile rules.
- **Public transport lives under `api/submissions/public/`** and authenticates by token, not session.
  Staff transport lives under `api/submissions/queries|commands/` and uses `AuthGuard`.
- **The link is the capability boundary, not the form.** The same `/submit/:token` screen resolves
  the scope and renders the right form. Adding a scope later must not add a new public route.
- **Draft autosave is server-side.** The entrepreneur may switch devices; localStorage is only a
  convenience cache and is never the source of truth.
- **Diff is computed on the server** from `base_snapshot_json` and the submitted payload. The client
  never computes or submits its own diff.
- **Applying is a second, deliberate step.** No auto-apply, no "trusted link" shortcut.
- **Legacy financial links are left alone.** `/financial/:token` and `nodes` request rows continue to
  work. New profile requests use `submission_links`.
- **Email moves server-side.** `CreateSubmissionLink` optionally sends the email itself so the raw
  token does not have to travel through a second browser call.
- **Secrets leave the source tree.** `mail/send.php` currently hardcodes SMTP credentials; this sprint
  moves them to `config/mail.php`, which follows the same never-upload discipline as
  `config/Database.php`.

---

## Routes

| Route | Auth | Purpose |
| --- | --- | --- |
| `/submit/:token` | public (token) | Generic submission screen; resolves scope |
| `/financial/:token` | public (token) | **Unchanged legacy** financial submission |
| `/company/:id/profile?section=requests` | session | Request panel: send, status, resend, revoke, review |
| `/company/:id/profile?section=requests&change=:changeId` | session | Review a submission diff |
| `POST /api/submissions/public/validate.php` | token | Resolve link → scope, company display name, expiry, state |
| `PUT  /api/submissions/public/draft.php` | token | Save a draft |
| `POST /api/submissions/public/submit.php` | token | Submit and create the change set |
| `GET  /api/submissions/queries/list-links.php?id=` | session | Links for a company |
| `GET  /api/submissions/queries/get-change.php?id=` | session | One change set + diff |
| `POST /api/submissions/commands/create-link.php` | session | Create (and optionally email) a link |
| `POST /api/submissions/commands/resend-link.php` | session | Re-send the same link |
| `POST /api/submissions/commands/revoke-link.php` | session | Revoke |
| `POST /api/submissions/commands/apply-change.php` | session | Apply selected fields |
| `POST /api/submissions/commands/reject-change.php` | session | Reject with a reason |

---

## Phases

### Phase 1 — Link foundation and mail hardening

Build the secure link capability and remove hardcoded mail credentials.

#### Tasks

- [ ] **1.1** Create `migrations/2026-10-21-submissions.sql` (idempotent, guarded): the three tables,
  FKs, `UNIQUE (token_hash)`, `UNIQUE (link_id)` on drafts, indexes
  `idx_sl_company_status`, `idx_sl_expires`, `idx_sc_company_status`, `idx_sc_submitted`.
- [ ] **1.2** Add `migrations/deployment/verify-014-submissions.sql` (tables, indexes, FK presence,
  no plaintext token column).
- [ ] **1.3** Create `capabilities/submissions/Repository/SubmissionLinkRepository.php`:
  `create`, `findByTokenHash`, `findById`, `listByCompany`, `markOpened`, `markSubmitted`,
  `revoke`, `incrementUsesAtomic` (`UPDATE … WHERE uses < max_uses`), `countActiveForCompany`.
- [ ] **1.4** Create `Contracts/SubmissionToken.php` — `generate()` (32 random bytes, base64url),
  `hash(string $token): string` (SHA-256), `last4()`, `equals()` (constant-time), `looksValid()`
  (length/charset) so invalid tokens are rejected before a DB hit.
- [ ] **1.5** Create `capabilities/submissions/Contracts/SubmissionScope.php` — the enum of scopes and
  their default expiry (`profile` 14 days, `financial` 7 days, others 14) plus `isImplemented()`.
- [ ] **1.6** Create `Application/Commands/CreateSubmissionLink.php` — validates company access,
  snapshots the current profile into `base_snapshot_json`, optionally sends the email, and returns
  `{ url, token_last4, expiresAt, emailSent }`. The raw URL is returned **once** to the authorised
  actor for copy; it is not persisted.
- [ ] **1.7** Create `ResendSubmissionLink` and `RevokeSubmissionLink` (idempotent; revoking an
  already-revoked link is a success no-op). Both write an audit entry with the actor.
- [ ] **1.8** Create `Repository/SubmissionAccessLogRepository.php` and record
  `opened | draft_saved | submitted | applied | rejected | revoked | send_failed` with a **hashed**
  IP, a truncated user agent and the link id. Never store the token.
- [ ] **1.9** Add rate limiting: max 30 requests/minute per token and 60/minute per hashed IP,
  evaluated from the access log; return `429` with `Retry-After` when exceeded.
- [ ] **1.10** Move SMTP settings out of `api-incubator-os/mail/send.php` into
  `api-incubator-os/config/mail.php` (host, port, secure, username, password, from, bcc). Read it via
  a small `MailConfig` contract. Add `config/mail.php` to the deployment never-upload list and update
  `docs/sprint-007-009-production-deployment.md` accordingly.
- [ ] **1.11** Require an authenticated session on the generic `mail/send.php` (the request dialog is
  already authenticated) and rate-limit it. Do not break `EmailService` callers.
- [ ] **1.12** Create the staff endpoints `create-link.php`, `resend-link.php`, `revoke-link.php`,
  `list-links.php` with `auth_require_user` + `auth_require_company_access`.

#### Exit Criteria

- [ ] The migration applies twice locally with no error.
- [ ] No column in the new tables can hold a raw token; `SELECT` shows only hash + last 4.
- [ ] A created link returns a URL and stores exactly one active row; the same token resolves once.
- [ ] Creating a link for a company the user cannot access returns `403`.
- [ ] A revoked link immediately fails validation; a resend keeps the same token and updates `sent_at`.
- [ ] `submission_access_log` records open/save/submit actions without the token or raw IP.
- [ ] `mail/send.php` contains no credentials; `config/mail.php` is documented as never-upload.
- [ ] `php -l` passes on every touched PHP file.

---

### Phase 2 — Public submission shell and drafts

Build `/submit/:token`: state resolution, scope-driven rendering, resumable drafts.

#### Tasks

- [ ] **2.1** Add the public route `/submit/:token` in `app.routes.ts` (no shell, no auth guard),
  lazy-loading `PublicSubmissionComponent`.
- [ ] **2.2** Create `src/app/public/public-submission/public-submission.component.ts` with explicit
  states: `loading | invalid | expired | revoked | used | form | submitted | unsupported_scope | error`.
  Each state has its own message and a single next action; no dead ends.
- [ ] **2.3** Create `src/app/public/public-submission/submission.service.ts` — `validate(token)`,
  `saveDraft(token, payload)`, `submit(token, payload)`, `resume(token)`.
- [ ] **2.4** Implement draft autosave: debounce 2 s after the last change, plus save on section blur
  and before unload; show a quiet "Saved · just now" indicator. A failed save is visible and retried
  on the next change, never silent.
- [ ] **2.5** Implement resume: on load, if a draft exists, restore it and show
  "Welcome back — we saved your progress on {date}".
- [ ] **2.6** Add a progress indicator per section (not per field) and a single sticky **Submit**
  action that is disabled until required fields are valid; explain what is missing.
- [ ] **2.7** Submit flow: confirm dialog → submit → success state with a reference and "You can close
  this page"; the link is consumed. Never show the diff to the entrepreneur.
- [ ] **2.8** Handle token edge cases: expiry during a session (next save returns `410`, UI switches
  to `expired`), double submit (second returns `409`, UI shows `submitted`), oversized draft (`413`).
- [ ] **2.9** Public-page layout: mobile-first, no app navigation, company name shown only after a
  valid token, no other company data, no autocomplete of sensitive fields, `noindex`.

#### Exit Criteria

- [ ] A valid profile token renders the form; an expired, revoked, used or random token renders the
  matching state with no server error and no data leakage.
- [ ] Saving a draft, closing the tab and reopening the link restores every answer.
- [ ] Submitting consumes the link; reopening shows `used/submitted` and a second POST returns `409`.
- [ ] Autosave never loses the most recent edit on refresh (verified by editing then reloading).
- [ ] The page is usable at 375 px with no horizontal scroll.
- [ ] Unsupported scopes show a clear "This request type is not available yet" state.

---

### Phase 3 — Profile submission form

Reuse Sprint 013's fields and rules in the public form.

#### Tasks

- [ ] **3.1** Create `ProfileSubmissionFormComponent` with sections: About the business, Who you sell
  to, Products and services, Contact details. Pre-fill from `base_snapshot_json`.
- [ ] **3.2** Reuse the same validation rules as Sprint 013 (description length, buyer type enum,
  website format, founded year range, price `>= 0`, at least the fields the coach marked required).
  Validation messages are identical to the coach-side form.
- [ ] **3.3** Reuse the offerings editor in a reduced form: add/edit/deactivate rows, price optional
  but flagged, no reorder requirement. Submitting an offering change is expressed as a full list, not
  row-level patches.
- [ ] **3.4** Define required fields for a submission: `name` (read-only), `description`,
  `buyer_type`, `target_market`, at least one active offering **or** an explicit "I have no offerings
  to list yet" checkbox. Everything else optional — never block an entrepreneur on a field they cannot
  answer.
- [ ] **3.5** Show "why we ask" help text on sector, buyer type and pricing (one sentence each),
  because these are the fields entrepreneurs most often leave blank.
- [ ] **3.6** Add a "Something is wrong with the pre-filled details" note that records a flag in the
  payload for the reviewer — it does not block submission.
- [ ] **3.7** Ensure `service_offering` and any field the coach owns but the entrepreneur should not
  change are **read-only** in the public form (registration number, compliance flags, ownership).

#### Exit Criteria

- [ ] An entrepreneur can complete the form on a phone, save midway and submit.
- [ ] Submitted payload contains every section, including offerings as a complete list.
- [ ] Required-field validation matches the coach-side form for the same values.
- [ ] Read-only fields cannot be altered by tampering with the request body (server re-validates the
  allowed field set).
- [ ] A payload with an unknown field is rejected or ignored explicitly; it is never persisted blindly.

---

### Phase 4 — Review, diff and apply

Turn a submission into a reviewed change.

#### Tasks

- [ ] **4.1** Create `Contracts/SubmissionDiff.php` — compares `base_snapshot_json`, the submitted
  payload and the **current** profile; emits:
  ```json
  {
    "fields": [
      { "key": "description", "label": "Business description",
        "current": "…", "proposed": "…", "status": "changed" },
      { "key": "target_market", "label": "Target market",
        "current": "…", "proposed": "…", "status": "conflict" }
    ],
    "offerings": { "added": [], "changed": [], "deactivated": [] }
  }
  ```
  `status` ∈ `same | changed | added | removed | conflict`.
- [ ] **4.2** Create `Application/Queries/GetSubmissionChange.php` and `GetSubmissionLinkStatus.php`.
- [ ] **4.3** Create `Application/Commands/ApplySubmissionChange.php`:
  - accepts `change_id` + an explicit list of accepted field keys (default: all non-conflict changes);
  - re-validates the accepted values with the Sprint 013 rules;
  - updates `companies` and `company_products_services` in one transaction;
  - writes **one** `company_profile_revisions` row (`source='submission_apply'`,
    `changed_by` = reviewer);
  - sets `status='applied'`, `applied_at`, `applied_revision_no`;
  - refuses to apply a change that is not `pending`.
- [ ] **4.4** Create `RejectSubmissionChange` with a required reason; the link stays consumed.
- [ ] **4.5** Conflict handling: any `conflict` field must be resolved explicitly (choose submitted or
  keep current) before the change can be applied; the UI cannot submit a partial apply silently.
- [ ] **4.6** Build the review UI in the Profile tab (`section=requests`): list of submissions with
  status chips, a diff view grouped by section (changed / unchanged / conflicts), per-field accept
  toggles, offering changes, and **Apply** / **Reject** actions with confirmation.
- [ ] **4.7** Show the applied revision on the Profile page ("Last updated by {user} on {date} from an
  entrepreneur submission") and link to the change.
- [ ] **4.8** Ensure a submission for a company the reviewer cannot access returns `403`, and a
  non-pending change cannot be applied twice (`409`).

#### Exit Criteria

- [ ] A submitted profile appears as `pending` with an accurate diff for every changed field.
- [ ] Applying all non-conflict fields updates the profile and offerings; `get-profile` reflects it
  immediately; exactly one revision row is added.
- [ ] A field changed on the coach side after the link was sent is flagged `conflict`; applying
  without resolving it is refused.
- [ ] Rejecting stores the reason and writes no profile change.
- [ ] Applying a non-pending change returns `409`; applying as an unauthorised user returns `403`.
- [ ] The revision `changed_fields_json` lists only the fields that actually changed.

---

### Phase 5 — Request management UX and notifications

Make the request loop usable from the company screen.

#### Tasks

- [ ] **5.1** Add a **Requests** section to the Profile page with: create request, scope selector
  (`profile` only enabled), recipient email (pre-filled from `companies.email_address`, override
  requires confirmation), expiry (default 14 days), and a "send email" toggle.
- [ ] **5.2** Show the raw link once after creation with **Copy link** and **Send email** actions; make
  clear that the link is a secret.
- [ ] **5.3** Status list per link: Sent {date} · Opened {date} · Draft saved {date} · Submitted {date}
  · Applied {date} · Expired · Revoked, with Resend / Revoke / Review actions.
- [ ] **5.4** Add a pending-submission count to the company Overview card and to the Profile tab label
  badge (the portfolio dashboard consumes the same query in Sprint 015).
- [ ] **5.5** Create email templates (subject + HTML) for: request, reminder/resend, and (optional)
  "your submission was received". Use the company's contact person name; never include other
  companies' data.
- [ ] **5.6** Record every send attempt in `submission_access_log` including failures, and surface a
  failed send in the UI with a retry action (the link still exists and can be copied manually).
- [ ] **5.7** Add an expiry sweep: `Application/Commands/ExpireSubmissionLinks.php` plus a CLI runner
  (`scripts/submissions-expire.php`) that flips overdue active links to `expired`. Must be safe to run
  repeatedly.
- [ ] **5.8** Add an in-app reminder on the Profile page when a link is within 48 hours of expiry and
  still a draft.

#### Exit Criteria

- [ ] A coach can create, copy, email, resend and revoke a profile request without leaving the company.
- [ ] Status transitions are accurate and survive a refresh.
- [ ] A failed email shows an error and the link remains usable via copy.
- [ ] The expiry CLI marks overdue links `expired` and is idempotent.
- [ ] Pending counts match the number of `submission_changes` with `status='pending'`.
- [ ] No email is sent to an address other than the confirmed recipient.

---

### Phase 6 — Hardening, compatibility and verification

#### Tasks

- [ ] **6.1** Verify `/financial/:token` still works end-to-end (validate, submit, used state) and that
  old `nodes` request rows are untouched.
- [ ] **6.2** Add brute-force protection tests: 100 random tokens produce `404`-equivalent states, no
  timing difference that reveals existence, and rate limiting triggers.
- [ ] **6.3** Add request-size and content limits on every public endpoint (`64 KB` draft, `256 KB`
  submit), JSON-only, no HTML reflection.
- [ ] **6.4** Confirm no token, email, ID number or raw IP is written to `error_log`; review every new
  `catch` block.
- [ ] **6.5** Add a PHP harness `tests/Submissions.php` covering: token hashing, expiry, revoke,
  double submit, conflict, apply, revision count, cross-company denial, rate limit.
- [ ] **6.6** Add a manual test script `test-submission-flow.ps1` (repo convention) that creates a
  link, validates, saves a draft, submits, applies and verifies the profile.
- [ ] **6.7** Update `capabilities/submissions/AI.md`, `feature.json`, the deployment manifest and the
  never-upload list (mail config).
- [ ] **6.8** Record the finish in a session file and tick this sprint.

#### Exit Criteria

- [ ] Legacy `/financial/:token` is unchanged and verified.
- [ ] The harness passes for every invariant in this sprint.
- [ ] Manual flow script completes against the local Docker stack.
- [ ] No secret, token or PII appears in logs or in the database in plaintext.
- [ ] `ng build --configuration development` is clean; `npm run prod` succeeds.
- [ ] Session file and sprint checkboxes are updated.

---

## Execution Order

```
Phase 1 ──> Link foundation + mail hardening
    │
    ▼
Phase 2 ──> Public shell + drafts
    │
    ▼
Phase 3 ──> Profile submission form
    │
    ▼
Phase 4 ──> Review, diff and apply
    │
    ▼
Phase 5 ──> Request management + notifications
    │
    ▼
Phase 6 ──> Hardening and verification
```

Phases 1–2 are independently deployable (links can be created and drafts saved) but must not be
announced to users until Phase 4 makes submissions actionable.

---

## Target File Structure

```
api-incubator-os/
├── migrations/
│   ├── 2026-10-21-submissions.sql                     (new)
│   └── deployment/verify-014-submissions.sql           (new)
├── config/mail.php                                     (new — never upload)
├── capabilities/submissions/
│   ├── AI.md / feature.json                            (new)
│   ├── Application/
│   │   ├── Commands/
│   │   │   ├── CreateSubmissionLink.php                (new)
│   │   │   ├── ResendSubmissionLink.php                (new)
│   │   │   ├── RevokeSubmissionLink.php                (new)
│   │   │   ├── ApplySubmissionChange.php               (new)
│   │   │   ├── RejectSubmissionChange.php              (new)
│   │   │   └── ExpireSubmissionLinks.php               (new)
│   │   └── Queries/
│   │       ├── ValidateSubmissionLink.php              (new)
│   │       ├── ListSubmissionLinks.php                 (new)
│   │       └── GetSubmissionChange.php                 (new)
│   ├── Contracts/
│   │   ├── SubmissionToken.php                         (new)
│   │   ├── SubmissionScope.php                         (new)
│   │   ├── SubmissionDiff.php                          (new)
│   │   └── Responses/…                                 (new)
│   └── Repository/
│       ├── SubmissionLinkRepository.php                (new)
│       ├── SubmissionDraftRepository.php               (new)
│       ├── SubmissionChangeRepository.php              (new)
│       └── SubmissionAccessLogRepository.php           (new)
├── api/submissions/
│   ├── public/{validate,draft,submit}.php              (new)
│   ├── queries/{list-links,get-change}.php             (new)
│   └── commands/{create-link,resend-link,revoke-link,apply-change,reject-change}.php (new)
├── mail/send.php                                       (harden)
└── scripts/submissions-expire.php                      (new)

src/app/
├── public/public-submission/
│   ├── public-submission.component.ts                  (new)
│   ├── submission.service.ts                           (new)
│   └── components/profile-submission-form.component.ts (new)
├── components/company-shell/pages/profile/
│   └── components/profile-requests-panel.component.ts  (new)
│       components/submission-diff.component.ts          (new)
├── app.routes.ts                                       (public + review routes)
└── services/company-capability.service.ts              (pending counts)
```

---

## Out of Scope

- **Auto-apply** or "trusted entrepreneur" bypass — explicitly rejected (D3).
- **Evidence/document uploads** in submissions (scope reserved, not implemented).
- **Financial indicator submission through `/submit/:token`** — legacy link remains; migration is a
  follow-up.
- **Annual review workflow** (scope reserved).
- **Two-way chat** between coach and entrepreneur.
- **SMS/WhatsApp delivery** — email + copy link only.
- **Public report links** — Sprint 016.
- **Changes to the ownership, compliance or financial calculation rules.**

---

## Future Modules (Reserved)

- Per-field request scoping ("please update only your pricing").
- Multi-step annual review that bundles profile + financials + evidence.
- Digital signature/attestation on submission.
- Reminder schedules (e.g. 3 days before expiry) driven by the same access log.
- Migrating legacy `nodes` financial links into `submission_links` once no live links remain.

---

## Definition of Done

The sprint is complete when:

- [ ] All six phases and their exit criteria are satisfied.
- [ ] A coach can request a profile update and an entrepreneur can complete it on a phone, resumably.
- [ ] Every submission produces a diff; nothing is applied without explicit review.
- [ ] Conflicts are detectable and block blind application.
- [ ] Applying a submission writes exactly one profile revision.
- [ ] Tokens are hashed at rest, expiring, revocable, rate-limited and never logged.
- [ ] `/financial/:token` still works.
- [ ] SMTP credentials are out of the source tree and covered by the never-upload rule.
- [ ] `ng build --configuration development` is clean; `npm run prod` succeeds; `php -l` passes.
- [ ] Harness + manual flow script pass locally.
- [ ] Session file and sprint checkboxes are updated.
