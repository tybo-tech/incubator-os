# Incubator OS - Sprint 007/008/009 Safe Smoke Tests

**Use only normal application functionality.** Create clearly identifiable disposable records and clean
them up. **Never delete or mutate an immutable proof record** (a verified achievement snapshot, or a
production record you did not create).

Naming convention for disposable records: prefix every title/subject with `ZZ-DEPLOY-CHECK-<date>`
so they are trivially findable and safe to remove.

> Test accounts: use your normal production accounts. **Do not** use the local development
> credentials (they are local-only and will be rejected in production). If you need an SA and a
> non-admin Director, use real production accounts.
> Cross-company tests need a user whose `company_id` differs from the record's company.

---

## A. Authentication (API-level, browser DevTools or a REST client)

| # | Check | Expected |
|---|---|---|
| A1 | Call `GET <ApiBase>api/calendar/queries/list.php?start=2026-01-01&end=2026-01-31` while logged out | `401` |
| A2 | Call `GET <ApiBase>api/sessions/queries/list.php?company_id=99` while logged out | `401` |
| A3 | Call `GET <ApiBase>api/sessions/queries/list.php` with no `company_id`, logged in | `422` |
| A4 | Logged in as a non-admin user for company X, call `list.php?company_id=<other company>` | `403` |
| A5 | Logged in, call `api/sessions/queries/upcoming.php` with no range | `422` |
| A6 | No response body (for A1/A2) contains a raw SQLSTATE or stack trace | clean JSON only |

---

## B. Results / Achievements (Sprint 007)

| # | Check | How | Expected |
|---|---|---|---|
| B1 | Existing Results screen loads | Navigate to Results for a company | Renders; no console errors |
| B2 | Awaiting-review path loads | Open the Awaiting Review list | Renders (may be empty) |
| B3 | Financial measurement flow still works | Open financial indicators; create/verify a revenue target for a disposable company or use an existing flow | Existing flow unaffected |
| B4 | A verified achievement is immutable | Open a **pre-existing verified** achievement | Evidence add/delete is blocked (`409`); the record is not editable |
| B5 | Snapshot guard blocks duplicates | Only if you create a new disposable eligible achievement: verify it, confirm exactly one `metric_snapshot`; attempting a second snapshot is refused | `409`; one snapshot only |
| B6 | Director cannot perform SA-only verification | Logged in as a non-admin Director, attempt `verify` on a disposable draft achievement | `403` |
| B7 | Unresolved-row reporting is honest | Inspect a company with unresolved account rows | Shows `partial_coverage` / `unresolved_rows`; never fabricates a number |

**Cleanup:** delete only disposable `ZZ-DEPLOY-CHECK-*` achievements you created while still `unverified`.
If you verified one as a test, **do not delete it** - a verified snapshot is an immutable audit record;
leave it and note it in the deployment log. Prefer B4 (read-only) to prove immutability without creating
a new verified record.

---

## C. Calendar (Sprint 008)

| # | Check | How | Expected |
|---|---|---|---|
| C1 | Global calendar loads | Open the global calendar view | Month renders |
| C2 | Company calendar loads | Open a company calendar | Month + agenda render |
| C3 | Create an unlinked test event | Create `ZZ-DEPLOY-CHECK-<date>` (meeting, timed) | Appears on the calendar |
| C4 | Edit the test event | Change its title | Updated; version increments |
| C5 | Delete the test event | Delete it | Removed (soft-deleted); re-delete `404` |
| C6 | All-day date preserved | Create an all-day event on, say, the 15th; reload | Still the 15th (no off-by-one) |
| C7 | Timed timezone preserved | Create a timed event at a specific local time; reload | Same intended local time |
| C8 | Cross-company denied | As a company user, request another company's events | `403` |
| C9 | System-wide creation SA-only | Non-admin attempts to create a system-wide event | `403` |

**Cleanup:** delete the `ZZ-DEPLOY-CHECK-*` calendar events (C5 covers one).

---

## D. Sessions (Sprint 009)

| # | Check | How | Expected |
|---|---|---|---|
| D1 | Create a disposable Session with its calendar event | New Session `ZZ-DEPLOY-CHECK-<date>`, choose/create a company meeting event | Session created **and** its calendar event exists (atomic) |
| D2 | Atomic creation proven | If you force a failure (e.g. an invalid schedule), confirm neither the Session nor an orphan event is left behind | Neither exists |
| D3 | Start the Session | Move to IN_PROGRESS | Status changes; `started_at` set |
| D4 | Complete the Session | Move to COMPLETED | Status changes; `completed_at` set |
| D5 | Completed Session is frozen | Try to edit agenda/notes/decisions/links | `409` `SESSION_FROZEN`; UI is read-only |
| D6 | Linked calendar event cannot be deleted | Attempt to delete the event linked to the Session | `409` with `code=SESSION_LINKED`; event survives |
| D7 | Cancel a second disposable Session with a reason | Create `ZZ-DEPLOY-CHECK-<date>-cancel`, start, then cancel with a reason | Session CANCELLED; linked event becomes `cancelled` |
| D8 | Incubator-only notes are isolated | As a company (non-admin) user, open a Session that has an `incubator` note | The incubator note is absent (not just hidden) |
| D9 | Cross-company links rejected | Link the Session to a record belonging to another company | `403`; nothing written |
| D10 | Invalid transition rejected | Attempt `PREPARING -> COMPLETED` directly | `409` `SESSION_INVALID_TRANSITION` |

**Cleanup:** Sessions are cancelled (terminal) rather than deleted - there is no delete endpoint.
Cancelled `ZZ-DEPLOY-CHECK-*` Sessions are harmless; leave them and note them in the deployment log.
Unlinked disposable calendar events you created may be deleted.

---

## E. Post-deployment integrity

Run [`post-migration-integrity-summary.sql`](post-migration-integrity-summary.sql) (single result grid).
Record the output.

| # | Check | Expected |
|---|---|---|
| E1 | Structure query | All objects `present = 1` |
| E2 | Snapshot guard | 0 duplicate-snapshot rows |
| E3 | Orphan evidence | 0 |
| E4 | Cross-company achievement target | 0 |
| E5 | Calendar time-shape | 0 invalid rows; `check_declared = 1` |
| E6 | Session integrity (F1-F6) | 0 rows everywhere |
| E7 | Row counts | Recorded as evidence |

---

## F. Evidence to capture

- [ ] Preflight grids (all sections)
- [ ] Post-migration integrity output
- [ ] Smoke-test results A1-D10
- [ ] The deployed `index.html` and `main-*.js` filenames + SHA-256
- [ ] Any deviation, and the decision taken
