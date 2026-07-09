# Import Applicants to Companies

## Goal

Import all 342 grant application records from the `nodes` table into the `companies` table so that:

1. Each applicant becomes a proper company record with structured fields
2. The `grant_application` node's `company_id` gets set to the new company's ID
3. Future work uses the `companies` table as the source of truth for company data

## Data Sources

### Source: Grant Applications (nodes table)

**Endpoint:** `GET /api-nodes/node/get-nodes-by-type.php?type=grant_application`

**Count:** 342 records

**Structure (per node):**

| Field | Type | Example |
|---|---|---|
| `id` | int | 2240 |
| `type` | string | `grant_application` |
| `company_id` | null | always null |
| `parent_id` | null | always null |
| `created_at` | string | `2026-04-28 14:00:00` |
| `data.company_name` | string | `035 Designs and Print` |
| `data.registration_number` | string | `2017/468322/07` |
| `data.status` | string | `stage_1780029748875` |
| `data.address_line1` | string | `Hluhluwe tourist square` |
| `data.address_line2` | string | `Shop 54` |
| `data.suburb` | string | |
| `data.city` | string | `Mhlathuze` |
| `data.district` | string | `King Cetshwayo` |
| `data.province` | string | `KwaZulu-Natal` |
| `data.youth_owned` | bool | true |
| `data.black_owned` | bool | true |
| `data.bank_statement_grand_total` | number | 2352125 |
| `data.bank_statement_months` | int | 12 |
| `data.directors` | array | 2 directors |
| `data.checklist` | array | 6 items |
| `data.status_history` | array | 1 entry |

### Target: Companies (companies table)

**Endpoint:** `GET /api-nodes/company/list-companies.php`

**Count:** 59+ existing companies

**Structure:**

| Field | Type | Example |
|---|---|---|
| `id` | int | 59 |
| `name` | string | `035 Freshcuts (Pty) Ltd` |
| `registration_no` | string | `2022/827697/07` |
| `trading_name` | string | |
| `city` | string | `Richards Bay` |
| `suburb` | string | |
| `address` | string | |
| `business_location` | string | `Richards Bay` |
| `contact_number` | string | `078 273 5369` |
| `email_address` | string | |
| `youth_owned` | bool | true |
| `black_ownership` | bool | true |
| `black_women_ownership` | bool | false |
| `turnover_estimated` | number | null |
| `turnover_actual` | number | null |
| `permanent_employees` | int | 0 |
| `temporary_employees` | int | 0 |
| `industry_id` | int | 64 |
| `bbbee_level` | string | |
| `has_valid_bbbbee` | bool | false |
| `has_tax_clearance` | bool | false |
| `is_sars_registered` | bool | false |
| `has_cipc_registration` | bool | true |
| `bbbee_valid_status` | string | `Expired` |
| `bbbee_expiry_date` | string | `2024-10-03` |
| `tax_valid_status` | string | |
| `tax_pin_expiry_date` | string | |
| `vat_number` | string | |
| `cipc_status` | string | `No returns filed 23/24 O/S - Deregistered status` |
| `service_offering` | string | `Barbor` |
| `description` | string | `#fy24` |
| `compliance_notes` | string | |
| `locations` | string | `Richards Bay` |
| `created_at` | string | `2025-09-19 06:27:14` |
| `updated_at` | string | `2025-10-04 07:03:25` |

## Field Mapping

| Grant Application (data.*) | Company (WRITABLE) | Notes |
|---|---|---|
| `company_name` | `name` | Required |
| `registration_number` | `registration_no` | Natural key for upsert |
| `trade_name` | `trading_name` | |
| `address_line1` + `address_line2` | `address` | Concatenate |
| `suburb` | `suburb` | |
| `city` | `city` | |
| `province` | `business_location` | Closest match |
| `youth_owned` | `youth_owned` | |
| `black_owned` | `black_ownership` | |
| `black_women_owned` | `black_women_ownership` | |
| `bank_statement_grand_total` | `turnover_actual` | Best estimate of actual turnover |
| `industry_name` | → `industry_id` | Needs lookup via `industries` table |

## Existing Tools

The `Company` model already has:

- **`upsertByRegistrationNo(registrationNo, data)`** — idempotent: if a company with that reg number exists, update it; otherwise insert. Perfect for this import.
- **`bulkAdd(rows, upsertByRegistrationNo = true)`** — transactional batch import with upsert support.

## Import Strategy

### Option A: Backend Service (Recommended)

Create a new capability endpoint:

```
api/grant-applications/commands/import-to-companies.php
```

The service would:

1. Fetch all `grant_application` nodes
2. For each node, map fields to company WRITABLE format
3. Call `Company::upsertByRegistrationNo()` to create/update the company
4. Update the node's `company_id` to the new company's ID
5. Return summary (inserted, updated, skipped, errors)

### Option B: One-off Script

A standalone PHP script that does the same but runs once and is deleted after.

## Risks

1. **Duplicate registration numbers** — some applicants have `Nil` or malformed reg numbers. These will be skipped or need manual handling.
2. **Existing companies** — 59 companies already exist. The upsert by reg number handles this, but some may have different names for the same reg number.
3. **No rollback** — once imported, the `company_id` is set on the node. A dry-run mode should be added first.

## Next Step

Decide on Option A vs Option B, then I'll build it.
