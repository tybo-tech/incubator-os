# Grant Applications — Component Tree

```
ApplicantShellComponent (/admin/grant-funding/applications/:id)
│   Purpose: Shell with sticky header, applicant identity, current stage badge
│   Services: GrantApplicationService, WorkflowService, Router, ActivatedRoute
│   State: application (signal), isLoading (signal)
│   Computed: initial, currentStage, currentStageBgClass, currentStageDotClass
│   Methods: loadApplication(), navigateBack()
│
├── ApplicantOverviewComponent (default route — lazy loaded)
│   │   Purpose: Stage-based workspace with workflow tabs, ID card, bank summary,
│   │            checklist, and stage-specific panels
│   │   Services: GrantApplicationApiService, WorkflowService, ActivatedRoute
│   │   State: data (signal), isLoading, isSaving, showEditModal, selectedStage,
│   │          overview (signal), ddAnswers (signal), toast (signal)
│   │   Computed: currentStageKey, selectedStageConfig, workflow
│   │   Methods: loadData(), selectStage(), isFutureStage(), hasStageComponent(),
│   │            onChecklistDataUpdated(), onBankStatsChanged(), onSubDataUpdated(),
│   │            onModalSaved(), onDocumentsChanged()
│   │   Children:
│   │   ├── ApplicantIdCardComponent
│   │   │   Inputs: [data], [ddAnswers], [applicantId]
│   │   │   Outputs: editClicked, documentsChanged
│   │   │
│   │   ├── ApplicantEditModalComponent
│   │   │   Inputs: [applicantId], [data]
│   │   │   Outputs: closed, saved
│   │   │
│   │   ├── ApplicantBankStatementSummaryComponent
│   │   │   Inputs: [applicantId], [companyName], [bankStatements]
│   │   │
│   │   ├── ApplicantChecklistComponent
│   │   │   Inputs: [applicantId], [data], [viewingStage]
│   │   │   Outputs: dataUpdated
│   │   │
│   │   ├── ApplicantCompanyInfoComponent
│   │   │   Inputs: [applicantId], [data]
│   │   │   Outputs: dataUpdated
│   │   │
│   │   ├── ApplicantAddressComponent
│   │   │   Inputs: [applicantId], [data]
│   │   │   Outputs: dataUpdated
│   │   │
│   │   ├── ApplicantOwnershipComponent
│   │   │   Inputs: [applicantId], [data]
│   │   │   Outputs: dataUpdated
│   │   │
│   │   ├── ApplicantDirectorsComponent
│   │   │   Inputs: [applicantId], [data]
│   │   │   Outputs: dataUpdated
│   │   │
│   │   ├── ApplicantDocumentsComponent
│   │   │   Inputs: [applicantId], [data]
│   │   │   Outputs: dataUpdated
│   │   │
│   │   ├── ApplicantComplianceComponent
│   │   │   Input: [embeddedApplicantId]
│   │   │   Purpose: Edit compliance statuses (B-BBEE, tax, CIPC, SARS)
│   │   │
│   │   ├── ApplicantBankStatementsComponent ← ROOT COMPONENT
│   │   │   Input: [embeddedApplicantId]
│   │   │   Output: statsChanged
│   │   │   Purpose: Monthly turnover capture by financial year
│   │   │
│   │   ├── ApplicantInterviewComponent
│   │   │   Inputs: [applicantId], [templateId], [title], [companyId],
│   │   │           [companyName], [applicantData]
│   │   │
│   │   ├── ApplicantBusinessProcessComponent
│   │   │   Inputs: [companyId], [applicantId], [applicantData]
│   │   │
│   │   └── ApplicantStageActionsComponent
│   │       Inputs: [applicantId], [data], [viewingStage]
│   │       Outputs: dataUpdated
│   │
├── ApplicantComplianceComponent (lazy — standalone route)
│   │   Input: [embeddedApplicantId]
│   │   Purpose: Edit compliance statuses (standalone route version)
│   │
└── ApplicantBankStatementsComponent (lazy — standalone route)
    │   Input: [embeddedApplicantId]
    │   Output: statsChanged
    │   Purpose: Monthly turnover capture (standalone route version)
    │
    └── Internal types:
        ├── FyRow
        │   Properties: nodeId?, financial_year_id, financial_year_name,
        │               months (Record<string, number|undefined>), total,
        │               isSaving, saveTimeout?
        │
        ├── IFinancialYear (constant)
        │   Properties: id, name, fy_start_year, fy_end_year
        │
        └── FY_MONTH_COLUMNS (constant)
            Properties: key (m1-m12), label (Mar-Feb)
```

## Data Types

```typescript
interface FyRow {
  nodeId?: number;
  financial_year_id: number;
  financial_year_name: string;
  months: Record<string, number | undefined>;  // m1-m12
  total: number;
  isSaving: boolean;
  saveTimeout?: ReturnType<typeof setTimeout>;
}

interface IGrantBankStatementData {
  financial_year_id: number;
  financial_year_name: string;
  m1?: number; m2?: number; m3?: number; m4?: number;
  m5?: number; m6?: number; m7?: number; m8?: number;
  m9?: number; m10?: number; m11?: number; m12?: number;
  total_amount: number;
  notes?: string;
}

type GrantBankStatement = INode<IGrantBankStatementData>;
```
