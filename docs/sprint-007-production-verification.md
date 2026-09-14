# Sprint-007 — Production Deployment Verification

**Date:** 2026-09-16 (session 025)
**Commit deployed:** `2fa0052`
**Target:** `https://app.rbttacesd.co.za` · API `https://app.rbttacesd.co.za/api/api-nodes/` · DB `rbttaces_api` · server root `/app.rbttacesd.co.za`
**Authorization:** explicit production authorization for Sprint-007.
**Performed by:** operator (FileZilla + phpMyAdmin) with agent verification.

---

## 1. Configuration verification

The deployed Angular `Constants` object (from `chunk-LHXZHLLH.js`) is identical to `src/services/service.ts`:

```js
var t = typeof window<"u" && window.location.hostname==="localhost",
    a = { Currency:"ZAR", LocalUser:"currentUser",
          ApiBase: t ? "http://localhost:8080/" : "https://app.rbttacesd.co.za/api/",
          MainCompanyId:99, Images:{ South32Logo:"https://api.rbttacesd.co.za/image-library/south32-logo.png", ... } }
```

| Check | Result |
| --- | --- |
| API base (non-localhost) | `https://app.rbttacesd.co.za/api/` |
| `localhost:8080` in deployed bundle | 0 occurrences |
| Live data through the base (`financial-years/list-financial-years.php`) | `200 application/json` |
| `config/*.php` served as source? | No — executed, no source leaked |
| CORS (allowed origin) | `Access-Control-Allow-Origin: https://app.rbttacesd.co.za`, `Allow-Credentials: true` |
| CORS (unknown origin) | `*` |
| OPTIONS preflight | `200`, methods `GET, POST, PATCH, PUT, DELETE, OPTIONS` |

**Path mapping:** repo `api-incubator-os/api-nodes/...` → web `/api/api-nodes/...`; server root folder is `/app.rbttacesd.co.za`. Upload root inside `/api/` → target subfolders `api-nodes/`, `models/`, `services/`, `helpers/`. **Do not create `/api/api/`.**

## 2. Pre-deploy state (blocker)

Production code (backend + frontend) had been deployed via a whole-folder drop, but the database was still **pre-Sprint-007**. Authenticated SA calls returned:

```
SQLSTATE[42S02]: Base table or view not found: 1146 Table 'rbttaces_api.metric_type_accounts' doesn't exist
SQLSTATE[42S02]: Base table or view not found: 1146 Table 'rbttaces_api.achievements' doesn't exist
```

## 3. Migrations executed (in order)

1. `api-incubator-os/migrations/2026-09-15-results-achievements.sql`
2. `api-incubator-os/migrations/2026-09-16-achievements-snapshot-guard.sql`

Both additive and idempotent. Created `metric_type_accounts`, `achievements`, `achievement_evidence`; added the `gps_target_metrics` measurement columns; seeded 5 revenue bindings; added unique functional index `uq_evidence_metric_snapshot`.

## 4. Post-migration verification (live, authenticated SA — id 77, company 99)

| Endpoint | Result |
| --- | --- |
| `gps-targets/measures.php` | `200` — `REVENUE_TOTAL`, `REVENUE_EXPORT`, `REVENUE_ANNUAL` |
| `gps-targets/measures.php?company_id=99` | `200` — each `{account_count:0, usable:false}` |
| `metric-type-accounts/list.php` | `200` — **5 seed bindings** (ids 1–5) |
| `achievements/counts.php?company_id=99` | `200` — `{total:0, by_status:{unverified:0,verified:0,rejected:0,revoked:0}, decisions:0}` |
| `achievements/list.php?company_id=99` | `200 []` |
| `achievements/awaiting-review.php?company_id=99` | `200 []` |
| `achievement-evidence/list.php` (no id) | `400 {"error":"achievement_id required"}` (reachable, validated) |
| `gps-targets/measure-preview.php?company_id=99&metric_code=REVENUE_TOTAL&period_type=financial_year&period_ref=7` | `200` — `calculation_version:"rev1"`, `status:"no_accounts"`, coverage 2 required / 0 resolved |
| `gps-targets/measure-preview.php?...REVENUE_EXPORT...&period_ref=1` | `200` — coverage 1 required / 0 resolved |
| `achievements/verify.php` `{"id":999999}` | `404 {"error":"achievements id 999999 not found"}` |

### Seed bindings verified

| id | measure | account_type | account_id | combine |
| --- | --- | --- | --- | --- |
| 1 | REVENUE_TOTAL | domestic_revenue | NULL | sum |
| 2 | REVENUE_TOTAL | export_revenue | NULL | sum |
| 3 | REVENUE_EXPORT | export_revenue | NULL | sum |
| 4 | REVENUE_ANNUAL | domestic_revenue | NULL | sum |
| 5 | REVENUE_ANNUAL | export_revenue | NULL | sum |

### Production counts

| Entity | Count |
| --- | --- |
| Companies | 131 |
| Financial years | 10 (active `FY 2024/2025`) |
| `gps_target_metrics` | 0 |

## 5. Safety note applied

No real verified production achievement was created for testing — its `metric_snapshot` would become an immutable audit record. Verification used read-only endpoints and a non-existent id.

## 6. Outstanding (post-deploy)

- **Browser smoke** on production: `results`, `gps-targets-v2` (target popup: separate task/outcome progress + derived actual), `company/99/financial-indicators` → create revenue target; Results/Awaiting Review; modal behaviour; view persistence; zero unexpected post-login console errors.
- **Serve one Angular build:** two `main-*` bundles were observed (`main-TOB5U3OY.js`, `main-3QDBDHMX.js`) — clear server/CDN cache.
- **Artifact cleanup:** the whole-folder drop placed non-production files in the web root — 0-byte PHP (`category/ping.php`, `category/test-endpoint.php`, `category/debug-bulk-attach.php`, `category/bulk-attach-companies.php`, `node/add-form-definition.php`), dev scripts (`companies/migrate.php`, `gps/test-gps-import.php`, `gps/verify-action-items.php`, `swot/test-swot-import.php`, `swot/debug-ui-import.php`, `swot/verify-swot-action-items.php`, `company-accounts/test-companies-table.php`, `company-accounts/test-database.php`, `imports/normalized-migrate.php`, `imports/normalized-migrate-cli.php`), data/docs (`imports/*.json`, `grant/*.data.json`, `*.md`, `upload/uploads/*.png`). Remove or deny access.
- **Prod Director password** differs from local (`Test123!` is local-only), so the live Director-denial/isolation check still needs a real prod Director account.
