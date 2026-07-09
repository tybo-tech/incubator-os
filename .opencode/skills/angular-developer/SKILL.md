# Angular Developer — Capability Consumer

## Responsibilities

- Angular 19 (standalone components, signals, no NgModules)
- Consume backend capabilities, not persistence APIs
- Single service per capability (e.g. `CompanyCapabilityService`)
- TypeScript interfaces matching backend DTOs
- Tailwind CSS v4 + SCSS for styling
- Refer to `docs/standards/capability-specification-v1.md` for backend contracts

## Golden Rules

- Frontend calls **capabilities**, not endpoints — one service method per backend use case
- Never assemble data from multiple API calls — the backend capability returns everything in one response
- Never send `company_id` or storage keys — backend knows the context from the URL
- Every capability service method returns a typed Observable matching the backend DTO
- Components are `standalone: true` with explicit imports — no NgModules
- Use Angular Signals (`signal()`, `computed()`) for reactive state
- Use `BehaviorSubject` only for cross-component context (`ContextService`)
- Every completed task updates: Code → Session → Sprint

## Capability Service Template

```typescript
@Injectable({ providedIn: 'root' })
export class {Capability}CapabilityService {
  private baseUrl = `${Constants.ApiBase}/api/{capability}`;

  constructor(private http: HttpClient) {}

  getOverview(id: number): Observable<{Thing}OverviewResponse> {
    return this.http.get<{Thing}OverviewResponse>(
      `${this.baseUrl}/queries/get-overview.php?id=${id}`
    );
  }

  {businessAction}(id: number, data: {Action}Request): Observable<CommandResult> {
    return this.http.post<CommandResult>(
      `${this.baseUrl}/commands/{business-action}.php?id=${id}`, data
    );
  }
}
```

## Backend DTOs → TypeScript Interfaces

Map every backend PHP DTO to a TypeScript interface:

```typescript
interface CompanyOverviewResponse {
  company: ICompany;
  directors: DirectorSummary[];
  financial_summary?: FinancialSummary;
}

interface DirectorSummary {
  directorId: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  gender: string | null;
  id_number: string | null;
}

interface FinancialSummary {
  total_revenue: number;
  fy_count: number;
  latest_fy: string | null;
  active_months: number;
  captured_months: number;
}

interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
  auditId?: string;
  warnings?: string[];
}

interface RegisterDirectorRequest {
  full_name: string;
  email?: string;
  phone?: string;
  gender?: string;
  id_number?: string;
}
```

## Component Pattern

```typescript
@Component({
  selector: 'app-company-overview',
  standalone: true,
  imports: [CommonModule, MetricsOverviewComponent],
  template: `...`
})
export class CompanyOverviewComponent implements OnInit {
  companyId: string | null = null;
  overview = signal<CompanyOverviewResponse | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  constructor(
    private route: ActivatedRoute,
    private capability: CompanyCapabilityService
  ) {}

  ngOnInit(): void {
    this.route.parent?.params.subscribe(params => {
      this.companyId = params['id'];
      if (this.companyId) this.loadOverview();
    });
  }

  loadOverview(): void {
    if (!this.companyId) return;
    this.loading.set(true);
    this.error.set(null);
    const id = parseInt(this.companyId, 10);
    if (isNaN(id)) { this.error.set('Invalid ID'); this.loading.set(false); return; }
    this.capability.getOverview(id).subscribe({
      next: (data) => { this.overview.set(data); this.loading.set(false); },
      error: () => { this.error.set('Failed to load'); this.loading.set(false); },
    });
  }
}
```

## Startup Sequence

1. Read Sprint (`.ai/sprints/Sprint-NN.md`)
2. Read Latest Session (`.ai/sessions/NNN-YYYY-MM-DD.md`)
3. Understand current task
4. Work
5. Update Session
6. Update Sprint if necessary