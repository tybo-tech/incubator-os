# Sprint 011 — Phase 1 Proof

Date: 2026-09-25
Scope: Schema, enum and vocabulary (migration #26).

---

## Deliverables

| # | Artifact | Status |
| --- | --- | --- |
| 1.1 | `api-incubator-os/migrations/2026-09-25-site-visits.sql` (run order #26) | ✅ |
| 1.2 | Run-order #26 row in `api-incubator-os/migrations/README.md` | ✅ |
| 1.3 | `SessionType::SITE_VISIT` + `ALL` in `SessionVocabulary.php` | ✅ |
| 1.4 | `SessionValidator` accepts `site_visit` (validates via `SessionType::isValid`) | ✅ (no change needed) |
| 1.5 | `capabilities/sessions/Contracts/VisitVocabulary.php` | ✅ |
| 1.6 | `VisitReportResponse.php` + `VisitReportSummaryResponse.php` | ✅ |

---

## Migration #26 — structure verified

Applied locally **twice**; the second run reported only the idempotency note
(`session_type already includes site_visit`) and exited 0.

| Check | Result |
| --- | --- |
| Tables created | **4** — `session_visit_reports`, `session_visit_items`, `session_visit_signoffs`, `session_visit_report_versions` |
| `sessions.session_type` | `enum('coaching','progress_review','financial_review','assessment','workshop','other','site_visit')` |
| Foreign keys | **7** |
| Unique keys (non-PRIMARY) | **5** |
| Rows written | 0 |

### Foreign keys (7)

`session_visit_reports` → `sessions` (session_id), → `companies` (company_id),
→ `categories_item` (categories_item_id, SET NULL), → `sessions` (follow_up_session_id, SET NULL);
`session_visit_items` → `session_visit_reports` (CASCADE);
`session_visit_signoffs` → `session_visit_reports` (CASCADE);
`session_visit_report_versions` → `session_visit_reports` (CASCADE).

### Unique keys (5)

- `uq_visit_report_session` (`session_id`)
- `uq_visit_signoff_role` (`report_id`, `role`)
- `uq_visit_version` (`report_id`, `version_no`)
- plus the two FK-backing unique/PK indexes reported by `STATISTICS`.

---

## Vocabulary verified

| Assertion | Result |
| --- | --- |
| `SessionType::isValid('site_visit')` | `true` |
| `SessionType::isValid('other')` | `true` |
| `SessionType::isValid('bogus')` | `false` |
| `VisitReportStatus::isEditable('draft')` | `true` |
| `VisitReportStatus::isEditable('issued')` | `false` |
| `VisitSection::isValid('challenge')` | `true` |
| `VisitKind::isValid('ad_hoc')` | `true` |

---

## Regressions

| Suite | Result |
| --- | --- |
| `tests/Sessions.ps1` | **106/106** (was 105/105; the enum widening added no failures) |
| `tests/CalendarEvents.ps1` | **65/65** |

`php -l` clean on all four new/changed PHP files. `feature.json` parses.

---

## Notes / decisions honoured

- **Additive only.** The only existing table altered is `sessions` — a **value added** to the enum, no
  reorder, no removal. Existing Sessions are unaffected.
- **Sign-off carries `report_version_no`** (Discovery §4.2) so an acknowledgement cannot apply to a
  later re-issue.
- **Funding is never stored** on the report; the position is derived on read (Sprint 011 Phase 3).
- **`feature.json` deliberately lists only implemented capabilities.** New visit queries/commands are added in
  Phase 2 when their endpoints exist — declaring them now would misrepresent the capability surface.
- The **#25 → #26 deployment gate** holds: #26 is applied locally only and is **not** to be applied to
  production until #25 is production-verified.

---

## Phase 1 Exit Criteria

- [x] Migration #26 applies twice safely; creates 4 tables and the FK/UNIQUE set; only `sessions` altered (enum).
- [x] `site_visit` accepted; other types unchanged.
- [x] `php -l` clean on every new/changed file.
- [x] Sessions regression green (106/106); Calendar regression green (65/65).
