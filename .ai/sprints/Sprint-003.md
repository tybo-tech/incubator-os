# Sprint 003 — Funding Tracker Module

## Goal

Build the complete Funding Tracker module with three data types (Process Tracker, Itemized List, Payments Tracker) — each with table view, import, batch delete, individual CRUD, and company name matching.

## Tasks

### Phase 1: Foundation
- [x] Create data models (IProcessTracker, ICompanyPurchase, ISeedFunding)
- [x] Create company-level page components (ProcessTrackerPageComponent, PurchasePageComponent, SeedFundingPageComponent)
- [x] Create global admin page components (GrantProcessTrackerComponent, GrantPurchasesComponent, GrantSeedFundingComponent)
- [x] Create FundingTrackerShellComponent with 3 inner tabs
- [x] Add routes for company-level and admin-level views
- [x] Add tabs to CompanyShellComponent and GrantFundingShellComponent
- [x] Create list-all-companies.php lightweight endpoint
- [x] Create delete-nodes-batch.php endpoint
- [x] Add listAllCompanies() and deleteNodesBatch() to services

### Phase 2: Import & Company Matching
- [x] Import parses company name from column 1, matches against DB
- [x] Unmatched records get company_id: 0 with companyName stored in data
- [x] Yellow row highlighting for unlinked records
- [x] AssignCompanyComponent for manual company linking

### Phase 3: CRUD & Batch Operations
- [x] Select-all + batch delete on all 3 global pages
- [x] ProcessTrackerFormComponent — shared modal for add/edit with searchable company dropdown
- [x] Edit button on Process Tracker rows → opens form modal
- [x] New Record button on Process Tracker → opens form modal

### Phase 4: Complete Remaining Types
- [ ] Create PurchaseFormComponent — shared modal for add/edit purchases
- [ ] Create SeedFundingFormComponent — shared modal for add/edit seed funding
- [ ] Add edit/new buttons to GrantPurchasesComponent
- [ ] Add edit/new buttons to GrantSeedFundingComponent
- [ ] Update company-level PurchasePageComponent to use shared form
- [ ] Update company-level SeedFundingPageComponent to use shared form

### Phase 5: Polish
- [ ] Add toast notifications to all CRUD operations
- [ ] Add loading states to all async operations
- [ ] End-to-end verification of all three types
