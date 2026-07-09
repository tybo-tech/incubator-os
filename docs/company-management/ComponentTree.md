# Company Management — Component Tree

```
CompanyShellComponent (/company/:id)
│   Purpose: Parent shell with sticky header, company info, 7 navigation tabs
│   Services: CompanyService, ContextService, Router, ActivatedRoute
│   State: companyId, company, companyName, companyInitial, currentUrl, context params
│   Methods: loadCompanyInfo(), navigateBack(), isTabActive(), getQueryParams()
│
├── CompanyOverviewComponent (overview)
│   │   Purpose: Display company info, compliance status, ownership, metric cards
│   │   Services: CompanyService, ActivatedRoute
│   │   State: companyId, company, loading, error, companyMetrics
│   │   Methods: loadCompanyData(), updateCompanyMetrics(), getComplianceStatus()
│   │   Children:
│   │   └── MetricsOverviewComponent
│   │       Input: [metrics] — MetricCard[]
│   │       Purpose: Display metric cards in a grid
│   │
├── AssessmentTabComponent* (assessment)
│   │   Note: From components/companies/company-detail/ — NOT pages/assessment/
│   │
├── SwotTabComponent* (swot)
│   │   Note: From components/companies/company-detail/ — NOT pages/swot/
│   │
├── GpsTargetsTabComponent* (gps-targets)
│   │   Note: From components/companies/company-detail/ — NOT pages/gps-targets/
│   │
├── FinancialShellComponent (financials)
│   │   Purpose: Nested shell with 10 financial sub-tabs
│   │   Services: ContextService, Router, ActivatedRoute
│   │   State: currentUrl, context params
│   │   Methods: isTabActive(), getQueryParams()
│   │   Children:
│   │   ├── CompanyRevenueCaptureComponent (lazy)
│   │   ├── MonthlyRevenueComponent
│   │   ├── CostStructureDemoComponent
│   │   ├── BankStatementsComponent
│   │   ├── RevenueComponent
│   │   ├── ProfitsComponent
│   │   ├── QuarterlyCostSummaryComponent
│   │   ├── BalanceSheetComponent
│   │   ├── RatiosComponent
│   │   ├── FundsReceivedComponent
│   │   └── EmployeeCountComponent
│   │
│   └── FinancialBaseComponent (abstract base)
│       │   Purpose: Common data loading, error handling, unsaved changes, bulk save
│       │   Inputs: companyId, year
│       │   Services: CompanyFinancialItemService, FinancialCalculationService,
│       │             ContextService, FinancialChartService, FinancialItemHandlerService
│       │   State: isLoading (signal), hasError (signal), errorMessage (signal),
│       │          unsavedChanges (signal<Map>), hasUnsavedChanges (signal),
│       │          isSaving (signal), items (signal)
│       │   Computed: financialContext, availableYears
│       │   Methods: initializeContext(), loadItemsByType(), handleError(),
│       │            refreshData(), onYearChange(), bulkSaveChanges(),
│       │            persistItemChanges(), trackUnsavedChange(), clearUnsavedChanges()
│       │   Lifecycle hooks: afterItemsLoaded?, beforeItemsPersisted?, afterItemsPersisted?
│       │
├── ComplianceShellComponent (compliance)
│   │   Children (all lazy):
│   │   ├── AnnualReturnsComponent
│   │   ├── BeneficialOwnershipComponent
│   │   ├── TaxRegistrationsComponent
│   │   ├── BBBEEComplianceComponent
│   │   └── OtherStatutoryTasksComponent
│   │
└── CoachingGuideShellComponent (coaching)
    │   Children (all lazy):
    │   ├── ProductsServicesComponent
    │   ├── MarketingComponent
    │   ├── SalesComponent
    │   └── CoachingNotesComponent
```

## Orphaned Components (not wired into routes)

```
pages/assessment/AssessmentComponent
    Purpose: Route-based assessment page (replacement for AssessmentTabComponent)
    Status: NOT USED — routes use AssessmentTabComponent from company-detail/

pages/swot/SwotComponent (872 lines, monolithic)
    Purpose: Route-based SWOT analysis page
    Status: NOT USED — routes use SwotTabComponent from company-detail/

pages/swot/SwotRefactoredComponent (308 lines)
    Purpose: Refactored SWOT with service delegation
    Status: NOT USED

pages/gps-targets/GpsTargetsComponent
    Purpose: Route-based GPS targets page
    Status: NOT USED — routes use GpsTargetsTabComponent from company-detail/

company-financials/CompanyFinancialsComponent
    Purpose: Standalone financial overview with mock data
    Status: NOT USED — FinancialShellComponent is canonical

financial-shell/FinancialDashboardComponent
    Purpose: Enterprise financial cockpit with domain registry
    Status: NOT USED — not referenced in any route or template
```
