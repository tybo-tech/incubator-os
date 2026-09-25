# Sprint 011 — Phase 2 Proof

Date: 2026-09-25
Scope: Visit report repository, state machine, validator, snapshot builder, service, commands and endpoints.

---

## Deliverables

| # | Artifact | Status |
| --- | --- | --- |
| 2.1 | `capabilities/sessions/Repository/VisitReportRepository.php` | ✅ |
| 2.2 | `capabilities/sessions/Services/VisitReportStateMachine.php` | ✅ |
| 2.3 | `capabilities/sessions/Services/VisitReportValidator.php` | ✅ |
| 2.4 | `capabilities/sessions/Services/VisitReportService.php` | ✅ |
| 2.5 | `capabilities/sessions/Services/VisitSnapshotBuilder.php` | ✅ |
| 2.6 | 3 visit queries + 5 visit commands (endpoints) | ✅ |
| 2.7 | `visitReportStatus` on `get.php` / `list.php` | ✅ |
| — | `Contracts/VisitReportMapper.php` | ✅ |
| — | `feature.json` visit queries/commands declared | ✅ |
| — | `SessionErrorResponder` structured validation codes | ✅ |

### Endpoints added (all under `api/sessions/`)

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `queries/visit-list.php` | GET | Company site visits + report summaries |
| `queries/visit-report.php` | GET | Full report, or the empty draft shape |
| `queries/visit-versions.php` | GET | Issued snapshot metadata |
| `commands/visit-save.php` | POST | Upsert the draft header (creates on first save) |
| `commands/visit-sections.php` | POST | add / update / reorder / delete a section item |
| `commands/visit-signoff.php` | POST | set / clear a sign-off |
| `commands/visit-issue.php` | POST | draft → issued: snapshot + version |
| `commands/visit-acknowledge.php` | POST | issued → acknowledged (version-bound) |

`visit-context.php` and `visit-export.php` are **deliberately not built** in Phase 2: they belong to Phase 3
(funding projection) and Phase 4 (PDF export) respectively. `feature.json` declares only what exists.

---

## Exit criteria — evidence

| Exit criterion | Result |
| --- | --- |
| `visit-report.php` returns a full report for a completed visit and an empty draft shape when none exists; never returns `incubator` notes | PASS — empty shape asserted; snapshot excludes the planted `INCUBATOR-SECRET` note |
| Saving a draft updates header + each section independently; `version` guards concurrent edits | PASS — version 1→2 accepted, stale version 409 `VISIT_STALE`, stale write did not persist |
| Issue rejects non-`COMPLETED` Session / missing enrolment / missing actual date | PASS — 409 `VISIT_SESSION_NOT_COMPLETED`, 422 `VISIT_ENROLMENT_REQUIRED`, 422 `VISIT_ACTUAL_DATE_REQUIRED` |
| Issuing writes exactly one immutable snapshot, increments `current_version`; a second issue returns `VISIT_ALREADY_ISSUED` | PASS — 1 version row, `currentVersion=1`, second issue 409 `VISIT_ALREADY_ISSUED` |
| Any content write after issue is `VISIT_NOT_DRAFT`/`VISIT_ALREADY_ISSUED`; acknowledgement from `issued` only | PASS — header/section/sign-off writes 409; re-ack 409 `VISIT_NOT_ISSUED` |
| Every mutation writes a `session_activities` row with the actor | PASS — `visit.report.issued` / `.acknowledged` asserted; saved/section/signoff also logged |
| Cross-company access 403; unknown ids 404 | PASS — cross-company save/issue 403 and wrote nothing; missing Session 404 |

---

## Concurrency / immutability details

- **Issue is guarded on both `status='draft'` AND `version`.** The version row is inserted first, then sign-offs
  are stamped, then the guarded transition runs. All three commit or roll back together (the command owns the
  transaction), so an issued report can never exist without its snapshot and a lost race leaves no orphan row.
- **Version number is `MAX(existing) + 1`**, not `current_version + 1`, so a retry can never reuse a version.
  `UNIQUE (report_id, version_no)` is the final backstop.
- **Repeated issue requests** (2 in sequence) were all rejected; exactly one version row remained.
- **Snapshot immutability proven directly**: renaming the company after issue left the stored
  `snapshot_json` MD5 unchanged, and the snapshot still holds the original name.
- **Acknowledgement does not modify the snapshot** (MD5 unchanged) and sign-offs stay stamped at version 1.
- **Snapshot `reportVersion` correctness**: an earlier build reported `0` because it read `current_version`
  before the transition. It now receives the version being issued explicitly — verified via
  `JSON_EXTRACT(snapshot_json,'$.header.reportVersion') = 1`.

---

## Test suite

`api-incubator-os/tests/SiteVisits.ps1` — 17 sections, **98 assertions**, all PASS:

1. Schema · 2. Empty draft read · 3. Type mismatch · 4. Draft save + optimistic concurrency ·
5. Sections · 6. Sign-offs · 7. Incubator-note planting · 8. Issue preconditions · 9. Atomic snapshot + version ·
10. Duplicate/concurrent issuance · 11. Content frozen after issue · 12. Snapshot immutability ·
13. Versions listing · 14. Version-specific acknowledgement · 15. Company list + session chip ·
16. Access control · 17. Tenant isolation.

### Regressions

| Suite | Result |
| --- | --- |
| `tests/SiteVisits.ps1` | **98/98** |
| `tests/Sessions.ps1` | **106/106** (unchanged) |
| `tests/CalendarEvents.ps1` | **65/65** |

`php -l` clean on all 27 new/changed PHP files; `feature.json` parses.

---

## Honest notes / boundaries

- **Funding is not read or written by any Phase 2 endpoint.** The "no funding column" assertion is structural;
  the actual projection is Phase 3.
- **No re-issue path exists.** Once issued, content is frozen; there is no `issued → draft`. The schema and
  service support future re-issue (version increments, sign-off re-stamping at issue), but no endpoint exposes
  it, so `VISIT_ALREADY_ISSUED` is the only outcome of a second issue today.
- **"Concurrent" issuance** is tested as rapid sequential requests plus the SQL-level guard. True parallel
  requests were not exercised under load; the guarantee rests on the single-statement guarded
  `UPDATE ... WHERE status='draft' AND version=?`.
- **Snapshot shape** is established but not yet documented as a stable contract — that is Phase 4 task 4.1.
- Production remains gated by **#25 verification**; migration #26 is local only.
