# Production verification WITHOUT writing SQL (phpMyAdmin GUI)

Use this if pasting SQL returns an empty/blank grid. **No SQL, no typing — just clicks.**
Every item below is visible in phpMyAdmin's normal interface.

> Why: a `SELECT` with no `FROM` clause *always* returns one row. If your paste returned
> "empty result set", the query was not executed on that tab — not a MySQL limitation and not
> missing support. The GUI always works, so verify here instead.

---

## 1. Which database am I in?

- Top-left: click the database name in the sidebar. The header must read **`rbttaces_api`**
  (e.g. `Server: ... » Database: rbttaces_api`).
- If the header does **not** name a database, or you are at the server level, queries run with
  no database selected — that alone explains "empty"/no results. Click `rbttaces_api` first.

## 2. The table list (left sidebar) - what must be present

Look at the sidebar table list under `rbttaces_api`.

**Sprint 007 (should already be there):**

| Table | Present? |
|---|---|
| `achievements` | ☐ |
| `achievement_evidence` | ☐ |
| `metric_type_accounts` | ☐ |

**Sprint 008 (you applied this):**

| Table | Present? |
|---|---|
| `calendar_events` | ☐ |
| `calendar_event_links` | ☐ |

**Sprint 009 (only after you apply sessions.sql):**

| Table | Present? |
|---|---|
| `sessions` | ☐ |
| `session_participants` | ☐ |
| `session_agenda_items` | ☐ |
| `session_notes` | ☐ |
| `session_decisions` | ☐ |
| `session_entity_links` | ☐ |
| `session_activities` | ☐ |

> The sidebar may be truncated - use the sidebar search box ("Type to filter these, Enter") and
> type `calendar`, then `session`, then `achievement` to confirm each.

## 3. Verify 007 structure (click, do not query)

1. Click **`achievements`** in the sidebar -> **Structure** tab.
   - Confirm columns include `verification_status`, `supersedes_id`, `company_id`, `gps_target_id`. ☐
2. Click **`achievement_evidence`** -> **Structure** tab.
   - Scroll to **Indexes**. A UNIQUE index named **`uq_evidence_metric_snapshot`** must be listed. ☐
   - (If it is not shown, go to the **Indexes** section via Structure; it is the functional index.)
3. Click **`metric_type_accounts`** -> **Browse** tab.
   - Expect **5 rows** (the revenue bindings). ☐
4. Click **`gps_target_metrics`** -> **Structure** tab.
   - Confirm these columns exist: `baseline_period_type`, `baseline_period_ref`,
     `target_period_type`, `target_period_ref`, `direction`, `calculation_method`,
     `maintain_tolerance_value`, `maintain_tolerance_unit`, `calculation_version`. ☐

## 4. Verify 008 structure

1. Click **`calendar_events`** -> **Structure** tab.
   - Columns include `all_day`, `timezone`, `start_date`, `end_date`, `start_at`, `end_at`,
     `version`, `client_token`, `deleted_at`. ☐
   - Scroll to **Constraints/Indexes**: a CHECK constraint **`chk_cal_time_shape`** must be listed
     (phpMyAdmin shows CHECK constraints in the Structure view on MySQL 8). ☐
2. Click **`calendar_event_links`** -> **Structure** tab.
   - Columns `calendar_event_id`, `entity_type`, `entity_id`. ☐

## 5. Verify 009 structure (AFTER applying sessions.sql)

1. Click **`sessions`** -> **Structure** tab.
   - Columns include `calendar_event_id` (UNIQUE), `status`, `tenant_id`, `version`,
     `cancellation_reason`, `completed_at`, `cancelled_at`. ☐
   - Unique index **`uq_sessions_calendar_event`** on `calendar_event_id`. ☐
2. Click **`session_participants`** -> **Structure** : column **`dedupe_key`** exists (generated). ☐
3. Click **`session_entity_links`** -> **Structure** : columns `entity_type`, `entity_id`,
   `relationship`. ☐
4. Click **`session_activities`** -> **Structure** : column **`payload`** (JSON). ☐

## 6. Data safety check (no SQL)

- Click **`achievements`** -> **Browse**. Record the row count shown at the top
  ("Showing rows ..."). You expect **0**.
- Click **`achievement_evidence`** -> **Browse**. Expect **0**.
  - **0 evidence means no verified snapshot exists → a rollback of 007 is still clean.**

---

## If you still want SQL: the smallest possible test

Run these **one at a time** (each is its own "Go"), in the `rbttaces_api` database:

```sql
SELECT 1;
```

If `SELECT 1;` returns "empty result set", phpMyAdmin is not executing your input at all
(wrong tab / not submitted / expired session) — log out and back in to phpMyAdmin, re-select
`rbttaces_api`, and try again. This is an environment issue, not a MySQL support issue.

Then, once `SELECT 1;` returns a row:

```sql
SHOW TABLES;
```

That lists every table with no subqueries and no `information_schema` — confirm the 007, 008
(and later 009) tables from section 2 are in the list.
