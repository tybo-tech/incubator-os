# Company — AI Context

## Purpose
Manage company profiles, directors, and financial overview. Replaces multiple legacy CRUD calls with a single capability endpoint.

## Dependencies
- **Users** — directors are stored as users with role=Director
- **Financial** — financial summary aggregated from `company_financial_yearly_stats`

## Queries
- `getOverview(id)` → `CompanyOverviewResponse` — company + directors + financial summary in one call

## Commands
- `updateProfile(companyId, request)` → `CommandResult` — update company profile fields
- `registerDirector(companyId, request)` → `CommandResult` — create user with role=Director
- `deactivateDirector(companyId, request)` → `CommandResult` — delete user if belongs to company

## Business Rules
- Directors are `User` records with `role = 'Director'` and `company_id` set
- Username defaults to email; if email is taken or missing, falls back to name-based unique username
- DeactivateDirector verifies the user belongs to the company before deleting
- All commands execute inside a `TransactionManager` — atomic commit or rollback

## Important DTOs
- `CompanyOverviewResponse` — {company, directors[], financialSummary?}
- `DirectorSummary` — {directorId, fullName, email, phone, role, gender, idNumber}
- `FinancialSummary` — {totalRevenue, fyCount, latestFy, activeMonths, capturedMonths}
- `CommandResult` — {success, message, data?, auditId?, warnings[]}
- `UpdateProfileRequest` — company profile fields
- `RegisterDirectorRequest` — {fullName, email?, phone?, gender?, idNumber?}
- `DeactivateDirectorRequest` — {directorId}

## Important Files
- `capabilities/company/Application/Queries/GetOverview.php`
- `capabilities/company/Application/Commands/RegisterDirector.php`
- `capabilities/company/Contracts/Projections/DirectorSummary.php`
- `capabilities/company/Repository/CompanyRepository.php`
- `capabilities/company/Repository/UserRepository.php`
- `api/company/queries/get-overview.php`
- `api/company/commands/register-director.php`

## Extension Points
- Add `GetCompliance` query use case
- Add `UploadDocument` command use case
- Add `approveCompany` / `archiveCompany` commands