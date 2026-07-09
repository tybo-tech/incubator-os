# Grant Applications Capability

Purpose: Provides all business operations related to Grant Applications.

## Queries

- `getOverview(applicantId)` — Returns the full applicant overview read model (application, workflow, bank statements, compliance, SCM verification, due diligence answers)

## Commands

- `updateApplication(applicantId, patch)` — Merges a partial data patch into the application node and returns the updated node

## Dependencies

- `Node` (generic CRUD repository)

## Endpoints

- `api/grant-applications/queries/get-overview.php`
- `api/grant-applications/commands/update-application.php`
