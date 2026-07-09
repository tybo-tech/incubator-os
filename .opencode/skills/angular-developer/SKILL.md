# Angular Developer

## Responsibilities

- Angular 19
- TypeScript
- Components (standalone, signals)
- Services (API layer, state management)
- Routing (lazy-loaded children)
- Forms (template-driven)
- Tailwind CSS v4
- Project conventions
- Read latest session
- Update latest session

## Golden Rules

- Never duplicate logic from backend
- UI owns presentation only
- Respect project conventions
- Every completed task updates: Code → Session → Sprint
- Update session before finishing

## Architecture

```
src/app/admin/grant-funding/
├── services/
│   ├── grant-application-api.service.ts   ← NEW: calls business capability endpoints
│   ├── grant-application.service.ts        ← LEGACY: calls api-nodes CRUD
│   ├── grant-funding-state.service.ts     ← State management (signals)
│   └── workflow.service.ts                ← Workflow cache
├── interfaces/
│   ├── grant-application.interfaces.ts    ← Domain types
│   └── applicant-overview.interface.ts    ← Read model contract
├── pages/                                 ← Route-level components
├── grant-funding-applications.component.ts
├── grant-funding-header.component.ts
├── grant-funding-filters.component.ts
├── grant-funding-table.component.ts
├── grant-funding-bulk-modal.component.ts
├── promote-to-cohort-modal.component.ts
└── workflow-settings.component.ts
```

## API Service Pattern

Always create a dedicated API service for business capability endpoints:

```typescript
@Injectable({ providedIn: 'root' })
export class GrantApplicationApiService {
  private baseUrl = `${Constants.ApiBase}/api/grant-applications`;

  constructor(private http: HttpClient) {}

  getOverview(applicantId: number): Observable<ApplicantOverview> {
    return this.http.get<ApplicantOverview>(
      `${this.baseUrl}/queries/get-overview.php?applicantId=${applicantId}`
    );
  }

  updateApplication(applicantId: number, data: Record<string, any>): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/commands/update-application.php`,
      { applicantId, data }
    );
  }
}
```

## State Management Pattern

Use a central state service with signals:

```typescript
export class GrantFundingStateService {
  applications = signal<GrantApplication[]>([]);
  filtered = signal<GrantApplication[]>([]);
  isLoading = signal(false);
  selectedIds = signal<Set<number>>(new Set());
  showPromoteModal = signal(false);
  promoteMode = signal<'import' | 'undo'>('import');
  selectedIdsArray = computed(() => Array.from(this.selectedIds()));
}
```

## Modal Pattern

Standalone component, controlled by state service signal:

```typescript
@Component({ standalone: true, ... })
export class PromoteToCohortModalComponent implements OnInit {
  state = inject(GrantFundingStateService);
  private api = inject(GrantApplicationApiService);
  private toast = inject(ToastService);
}
```

## Hierarchy Selector Pattern

Cascading 3-level selects (Client → Program → Cohort):

```typescript
onClientChange(): void {
  this.selectedProgramId = 0;
  this.selectedCohortId = 0;
  this.programs.set([]);
  this.cohorts.set([]);
  if (this.selectedClientId) {
    this.categorySvc.listProgramsForClient(this.selectedClientId).subscribe(...)
  }
}
```

## Category Hierarchy CRUD Pattern

All three levels (client, program, cohort) follow the same consistent UI pattern:

### Card Layout
- Edit button (pencil icon) and Delete button (trash icon) in top-right of each card
- Primary action button at bottom ("View Programs", "View Cohorts", "View Companies")
- Statistics grid showing counts
- `$event.stopPropagation()` on action buttons to prevent card click

### Create/Edit Modal
Reuse the shared `CreateModalComponent` for both create and edit:

```typescript
// Template
<app-create-modal
  [show]="showCreateModal() || showEditModal()"
  [config]="showEditModal() ? editModalConfig() : createModalConfig"
  [isSubmitting]="isCreating"
  (cancel)="closeEditModal()"
  (submit)="showEditModal() ? onEditSubmit($event) : onCreateSubmit($event)">
</app-create-modal>

// Config with initialData for edit
createModalConfig: CreateModalConfig = {
  title: 'Create New Client',
  submitLabel: 'Create Client',
  fields: [
    { key: 'name', label: 'Client Name', type: 'text', placeholder: 'Enter name', required: true },
    { key: 'description', label: 'Description', type: 'textarea', rows: 3 },
  ]
};

editModalConfig = computed<CreateModalConfig>(() => ({
  title: 'Edit Client',
  submitLabel: 'Save Changes',
  fields: [ /* same fields */ ],
  initialData: {
    name: this.editingItem()?.name ?? '',
    description: this.editingItem()?.description ?? '',
  }
}));
```

### Delete Pattern
```typescript
deleteItem(item: Item): void {
  if (confirm(`Are you sure you want to delete "${item.name}"? This action cannot be undone.`)) {
    this.isLoading.set(true);
    this.service.deleteCategory(item.id).pipe(
      catchError(error => {
        this.toastService.show('Failed to delete.', 'error');
        this.isLoading.set(false);
        return EMPTY;
      })
    ).subscribe(() => {
      this.toastService.show(`"${item.name}" deleted successfully.`, 'success');
      this.loadItems();
    });
  }
}
```

### Edit Submit Pattern
```typescript
onEditSubmit(formData: any): void {
  const item = this.editingItem();
  if (!item) return;
  this.isCreating.set(true);
  this.service.updateCategory(item.id, {
    name: formData.name,
    description: formData.description || undefined,
  }).pipe(
    catchError(error => { /* error handling */ })
  ).subscribe(() => {
    this.isCreating.set(false);
    this.closeEditModal();
    this.toastService.show(`"${formData.name}" updated successfully.`, 'success');
    this.loadItems();
  });
}
```

### State Signals
```typescript
showCreateModal = signal(false);
showEditModal = signal(false);
editingItem = signal<Item | null>(null);
isCreating = signal(false);
```

## Session Template

Every session file must follow this exact structure:

```markdown
# Session NNN

Date:
YYYY-MM-DD

## Goal

What was the objective?

---

## Completed

- Itemized list of what was done

---

## Frontend

Files modified

Components

Services

Issues

---

## Backend

Files modified

Controllers

Services

Database

---

## Decisions

Important architectural decisions made today.

---

## Outstanding

Things still incomplete.

---

## Next Session

The very next task that should be done.
```

## Startup Sequence

1. Read Sprint (`.ai/sprints/Sprint-NN.md`)
2. Read Latest Session (`.ai/sessions/NNN-YYYY-MM-DD.md`)
3. Read Session Template (above)
4. Understand current task
5. Work
6. Update Session (create new file in `.ai/sessions/`)
7. Update Sprint if necessary
