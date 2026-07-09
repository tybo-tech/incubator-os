# Company Management — API Inventory

## Company Endpoints

| Endpoint | Method | Used By | Parameters | Response | Purpose |
|---|---|---|---|---|---|
| `get-company.php` | GET | `CompanyService.getCompanyById()` | `id` (number) or `registration_no` (string) | `ICompany` | Fetch single company |
| `add-company.php` | POST | `CompanyService.addCompany()` | `Partial<ICompany>` body | `ICompany` | Create company |
| `update-company.php` | POST | `CompanyService.updateCompany()` | `id` + `Partial<ICompany>` body | `ICompany` | Update company |
| `upsert-company-by-regno.php` | POST | `CompanyService.upsertCompanyByRegNo()` | `registration_no` + `Partial<ICompany>` body | `ICompany` | Create or update by reg no |
| `search-companies.php` | GET | `CompanyService.searchCompanies()`, `searchCompaniesAdvanced()` | `limit`, `offset`, filters (search, industry_id, city, bbbee_level, has_tax_clearance) | `ICompany[]` or `CompanyListResponse` | Search with filters |
| `list-companies.php` | GET | `CompanyService.listCompanies()`, `getCompaniesByIndustry()` | `limit`, `offset`, `industry_id`, `page`, `search` | `ICompany[]` or `CompanyListResponse` | List with pagination |
| `delete-company.php` | POST | `CompanyService.deleteCompany()` | `id` | `any` | Delete company |
| `set-industry-by-name.php` | POST | `CompanyService.setIndustryByName()` | `company_id`, `industry_name` | `ICompany` | Assign industry |
| `bulk-import-companies.php` | POST | `CompanyService.bulkImportCompanies()` | `companies` (array), `upsertByRegistrationNo` (boolean) | `{inserted, updated}` | Bulk import |

## Financial Endpoints

Called via `CompanyFinancialItemService` (not shown in full detail):

| Endpoint | Method | Used By | Purpose |
|---|---|---|---|
| `list-financial-items-by-year-type.php` | GET | `FinancialBaseComponent.loadItemsByType()` | List financial items by year and type |
| `update-financial-item.php` | POST | `FinancialBaseComponent.persistItemChanges()` | Update single financial item |
| `add-financial-item.php` | POST | `FinancialBaseComponent.persistItemChanges()` | Create financial item |
| `delete-financial-item.php` | POST | `FinancialItemHandlerService.handleItemDeleted()` | Delete financial item |
| `bulk-update-financial-items.php` | POST | `FinancialBaseComponent.bulkSaveChanges()` | Bulk update items |
| `bulk-create-financial-items.php` | POST | `FinancialBaseComponent.bulkSaveChanges()` | Bulk create items |
| `refresh-company-year-summary.php` | POST | `FinancialBaseComponent.refreshProfitSummary()` | Refresh profit summary |

## Revenue Capture Endpoints

Called via `CompanyFinancialYearlyStatsService` and `FinancialDataTransformerService`:

| Endpoint | Method | Used By | Purpose |
|---|---|---|---|
| `add-yearly-stats.php` | POST | `RevenueCaptureHelperService.createEmptyRecord()` | Create empty yearly stats record |
| `delete-yearly-stats.php` | POST | `RevenueCaptureHelperService.deleteAccountData()` | Delete yearly stats record |
| `save-monthly-data.php` | POST | `RevenueCaptureHelperService.saveAccountData()` | Save monthly account data |

## Backend File Mapping

```
api-incubator-os/api-nodes/company/
├── get-company.php
├── add-company.php
├── update-company.php
├── upsert-company-by-regno.php
├── search-companies.php
├── list-companies.php
├── delete-company.php
├── set-industry-by-name.php
└── bulk-import-companies.php

api-incubator-os/api-nodes/financial/
├── list-financial-items-by-year-type.php
├── update-financial-item.php
├── add-financial-item.php
├── delete-financial-item.php
├── bulk-update-financial-items.php
├── bulk-create-financial-items.php
└── refresh-company-year-summary.php

api-incubator-os/api-nodes/financial-yearly-stats/
├── add-yearly-stats.php
└── delete-yearly-stats.php

api-incubator-os/api-nodes/financial-data/
└── save-monthly-data.php
```

## ICompany Response Shape

```typescript
interface ICompany {
  id: number;
  name: string;
  registration_no: string | null;
  bbbee_level: string | null;
  cipc_status: string | null;
  service_offering: string | null;
  description: string | null;
  city: string | null;
  suburb: string | null;
  address: string | null;
  postal_code: string | null;
  business_location: string | null;
  contact_number: string | null;
  email_address: string | null;
  trading_name: string | null;
  youth_owned: boolean;
  black_ownership: boolean;
  black_women_ownership: boolean;
  youth_owned_text: string | null;
  black_ownership_text: string | null;
  black_women_ownership_text: string | null;
  compliance_notes: string | null;
  has_valid_bbbbee: boolean;
  has_tax_clearance: boolean;
  is_sars_registered: boolean;
  has_cipc_registration: boolean;
  bbbee_valid_status: string | null;
  bbbee_expiry_date: string | null;
  tax_valid_status: string | null;
  tax_pin_expiry_date: string | null;
  vat_number: string | null;
  turnover_estimated: number | null;
  turnover_actual: number | null;
  permanent_employees: number;
  temporary_employees: number;
  locations: string | null;
  created_at: string;
  updated_at: string;
  industry_id: number | null;
  contact_person: string | null;
  sector_name: string | null;
}
```
