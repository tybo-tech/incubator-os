# Company Capability — Reference Architecture v3

## Problem

The frontend currently makes multiple API calls to assemble company information:

```
CompanyOverviewComponent
├── GET /api-nodes/company/get-company.php?id=N       → company fields
└── GET /api-nodes/user/list-users-by-company.php?id=N → directors
```

This violates the principle: *"Every endpoint must represent a business capability, not a database operation."*

---

## Proposed: Company Capability

### Backend Structure

```
api-incubator-os/
├── api/company/                              ← Transport layer (thin controllers)
│   ├── queries/
│   │   └── get-overview.php                  ← Delegates to GetOverview use case
│   └── commands/
│       ├── update-profile.php                ← Delegates to UpdateProfile use case
│       ├── register-director.php             ← Delegates to RegisterDirector use case
│       └── deactivate-director.php           ← Delegates to DeactivateDirector use case
└── capabilities/
    └── company/
        ├── feature.json                      ← Capability manifest
        ├── Application/
        │   ├── Queries/
        │   │   └── GetOverview.php           ← Single use case class
        │   └── Commands/
        │       ├── UpdateProfile.php
        │       ├── RegisterDirector.php
        │       └── DeactivateDirector.php
        ├── Contracts/
        │   ├── CompanyOverviewResponse.php   ← DTO: query response
        │   ├── DirectorSummary.php           ← DTO: director projection
        │   ├── FinancialSummary.php         ← DTO: financial projection
        │   ├── UpdateProfileRequest.php      ← DTO: command input
        │   ├── RegisterDirectorRequest.php   ← DTO: command input
        │   ├── DeactivateDirectorRequest.php ← DTO: command input
        │   └── CommandResult.php             ← DTO: command output
        ├── Infrastructure/
        │   └── TransactionManager.php        ← Wraps begin/commit/rollback
        └── README.md
```

---

## Key Architectural Decisions

### 1. Use Cases, not a monolithic Application Service

As the capability grows, a single `CompanyApplicationService` with 20+ methods becomes unwieldy. Instead, each business operation is its own class:

```
capabilities/company/Application/
├── Queries/
│   └── GetOverview.php
└── Commands/
    ├── UpdateProfile.php
    ├── RegisterDirector.php
    └── DeactivateDirector.php
```

Each use case has a single responsibility and a single public method:

```php
final class GetOverview
{
    public function __construct(
        private CompanyRepository $companyRepo,
        private UserRepository $userRepo,
        private FinancialRepository $financialRepo,
    ) {}

    public function execute(int $companyId): CompanyOverviewResponse
    {
        return new CompanyOverviewResponse(
            company: $this->companyRepo->getById($companyId),
            directors: array_map(
                fn($u) => DirectorSummary::fromUser($u),
                $this->userRepo->listByCompany($companyId)
            ),
            financialSummary: $this->financialRepo->getSummary($companyId),
        );
    }
}
```

The controller becomes a one-liner:

```php
// api/company/queries/get-overview.php
$result = (new GetOverview(
    new CompanyRepository($db),
    new UserRepository($db),
    new FinancialRepository($db),
))->execute((int)$_GET['id']);

echo json_encode($result);
```

### 2. DTO naming: `*Response` and `*Request`

| Pattern | Example | Purpose |
|---|---|---|
| `{Thing}Response` | `CompanyOverviewResponse` | Query output — never mutated |
| `{Action}Request` | `RegisterDirectorRequest` | Command input — validated before use |
| `{Thing}Summary` | `DirectorSummary` | Projection embedded in a response |
| `CommandResult` | `CommandResult` | Command output — success + metadata |

### 3. `DirectorSummary` uses `directorId`, not `id`

```php
final class DirectorSummary
{
    public function __construct(
        public readonly int $directorId,     // ← explicit, not ambiguous "id"
        public readonly string $fullName,
        public readonly ?string $email,
        public readonly ?string $phone,
        public readonly string $role,
        public readonly ?string $race,
        public readonly ?string $gender,
        public readonly ?string $idNumber,
    ) {}

    public static function fromUser(array $user): self
    {
        return new self(
            directorId: (int)$user['id'],
            fullName: $user['full_name'] ?? '',
            email: $user['email'] ?? null,
            phone: $user['phone'] ?? null,
            role: $user['role'] ?? 'Director',
            race: $user['race'] ?? null,
            gender: $user['gender'] ?? null,
            idNumber: $user['id_number'] ?? null,
        );
    }
}
```

### 4. Commands receive typed Request DTOs

```php
final class RegisterDirectorRequest
{
    public function __construct(
        public readonly string $fullName,
        public readonly ?string $email,
        public readonly ?string $phone,
        public readonly ?string $gender,
        public readonly ?string $idNumber,
    ) {}
}
```

No raw arrays. Every command's contract is explicit.

### 5. Commands return `CommandResult`

```php
final class CommandResult
{
    public function __construct(
        public readonly bool $success,
        public readonly string $message,
        public readonly ?array $data = null,     // e.g. DirectorSummary
        public readonly ?string $auditId = null,
        public readonly array $warnings = [],
    ) {}
}
```

The frontend always gets a consistent envelope:

```json
{
  "success": true,
  "message": "Director registered successfully",
  "data": { "directorId": 439, "full_name": "..." },
  "auditId": "aud_abc123"
}
```

### 6. Transactions managed by infrastructure

```php
final class TransactionManager
{
    public function __construct(private PDO $conn) {}

    public function execute(callable $fn): mixed
    {
        $this->conn->beginTransaction();
        try {
            $result = $fn();
            $this->conn->commit();
            return $result;
        } catch (Throwable $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }
}
```

Use cases don't call `beginTransaction()` directly. They receive a `TransactionManager` and wrap their logic:

```php
final class RegisterDirector
{
    public function __construct(
        private UserRepository $userRepo,
        private NotificationService $notifications,
        private TransactionManager $tx,
    ) {}

    public function execute(int $companyId, RegisterDirectorRequest $input): CommandResult
    {
        return $this->tx->execute(function () use ($companyId, $input) {
            $user = $this->userRepo->create([
                'company_id' => $companyId,
                'full_name' => $input->fullName,
                'email' => $input->email,
                'phone' => $input->phone,
                'username' => $input->email ?? $input->fullName,
                'role' => 'Director',
                'gender' => $input->gender,
                'id_number' => $input->idNumber,
                'status' => 'active',
            ]);
            $this->notifications->sendInvitation($user);
            return new CommandResult(
                success: true,
                message: 'Director registered successfully',
                data: DirectorSummary::fromUser($user),
            );
        });
    }
}
```

### 7. Company context from the route, not the body

```
POST /api/company/commands/register-director.php?id=1130
```

Payload is purely business data:

```json
{
  "full_name": "Sibusiso Mahlangu",
  "email": "sibusiso@example.com",
  "phone": "084 089 0282",
  "gender": "male",
  "id_number": "9012295765081"
}
```

The company ID comes from the query string (`?id=1130`), not the body. The frontend never sends `company_id` — it doesn't know about storage.

### 8. Capability manifest

```json
// capabilities/company/feature.json
{
  "name": "Company",
  "description": "Manage company profiles, directors, and financial overview",
  "queries": [
    { "name": "getOverview", "returns": "CompanyOverviewResponse" }
  ],
  "commands": [
    { "name": "updateProfile", "input": "UpdateProfileRequest", "returns": "CommandResult" },
    { "name": "registerDirector", "input": "RegisterDirectorRequest", "returns": "CommandResult" },
    { "name": "deactivateDirector", "input": "DeactivateDirectorRequest", "returns": "CommandResult" }
  ],
  "dependsOn": ["Users", "Financial"]
}
```

Every capability is discoverable by tooling and AI.

---

## Query: `GET /api/company/queries/get-overview.php?id=1130`

**Response shape:**

```json
{
  "company": {
    "id": 1130,
    "name": "035 Designs and Print",
    "registration_no": "2017/468322/07",
    "contact_person": null,
    "contact_number": null,
    "email_address": null,
    "trading_name": null,
    "city": null,
    "suburb": null,
    "address": null,
    "business_location": null,
    "service_offering": null,
    "cipc_status": null,
    "bbbee_level": null,
    "has_valid_bbbbee": false,
    "has_tax_clearance": false,
    "is_sars_registered": false,
    "has_cipc_registration": false,
    "youth_owned": false,
    "black_ownership": false,
    "black_women_ownership": false,
    "turnover_estimated": 0,
    "turnover_actual": 270493,
    "permanent_employees": 0,
    "temporary_employees": 0,
    "industry_id": null
  },
  "directors": [
    {
      "directorId": 439,
      "full_name": "Sibusiso Mahlangu",
      "email": null,
      "phone": "084 089 0282",
      "role": "Director",
      "race": null,
      "gender": "male",
      "id_number": "9012295765081"
    }
  ],
  "financial_summary": {
    "total_revenue": 270493,
    "fy_count": 1,
    "latest_fy": "FY 2024/2025",
    "active_months": 12,
    "captured_months": 12
  }
}
```

---

## Frontend

### New Service: `src/services/company-capability.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class CompanyCapabilityService {
  private baseUrl = `${Constants.ApiBase}/api/company`;

  constructor(private http: HttpClient) {}

  getOverview(companyId: number): Observable<CompanyOverviewResponse> {
    return this.http.get<CompanyOverviewResponse>(
      `${this.baseUrl}/queries/get-overview.php?id=${companyId}`
    );
  }

  updateProfile(companyId: number, data: UpdateProfileRequest): Observable<CommandResult> {
    return this.http.post<CommandResult>(
      `${this.baseUrl}/commands/update-profile.php?id=${companyId}`, data
    );
  }

  registerDirector(companyId: number, data: RegisterDirectorRequest): Observable<CommandResult> {
    return this.http.post<CommandResult>(
      `${this.baseUrl}/commands/register-director.php?id=${companyId}`, data
    );
  }

  deactivateDirector(companyId: number, userId: number): Observable<CommandResult> {
    return this.http.post<CommandResult>(
      `${this.baseUrl}/commands/deactivate-director.php?id=${companyId}`,
      { directorId: userId }
    );
  }
}
```

### Updated: `CompanyOverviewComponent`

- Replace `CompanyService.getCompanyById()` + `UserService.listUsersByCompany()` with single `CompanyCapabilityService.getOverview()`
- Add **Directors** section to the template:

```
┌─────────────────────────────────────────────┐
│ Directors                                    │
│                                             │
│ Sibusiso Mahlangu                           │
│ 084 089 0282  |  Director  |  Male          │
│ ID: 9012295765081                           │
└─────────────────────────────────────────────┘
```

---

## Full Capability Definition

| Operation | Type | Endpoint | Input DTO | Output DTO |
|---|---|---|---|---|
| `getOverview` | Query | `GET /api/company/queries/get-overview.php?id=N` | — | `CompanyOverviewResponse` |
| `updateProfile` | Command | `POST /api/company/commands/update-profile.php?id=N` | `UpdateProfileRequest` | `CommandResult` |
| `registerDirector` | Command | `POST /api/company/commands/register-director.php?id=N` | `RegisterDirectorRequest` | `CommandResult` |
| `deactivateDirector` | Command | `POST /api/company/commands/deactivate-director.php?id=N` | `DeactivateDirectorRequest` | `CommandResult` |

---

## Platform Standards (derived from this pattern)

1. **Thin controllers** — PHP endpoint files only parse input, call a use case, and serialize the response.
2. **Use cases, not services** — each business operation is a single class with one public method.
3. **DTOs for every contract** — `*Request` for command input, `*Response` for query output, `*Summary` for embedded projections.
4. **Immutable DTOs** — all DTO properties are `readonly`.
5. **`CommandResult` envelope** — every command returns `{success, message, data?, auditId?, warnings?}`.
6. **Route-scoped context** — entity IDs come from the URL, not the body.
7. **`TransactionManager` abstraction** — use cases don't manage transactions directly.
8. **`feature.json` manifest** — every capability has a discoverable manifest.
9. **No standalone sub-entity endpoints** — unless a separate business use case exists.
10. **Frontend consumes capabilities** — never assembles data from multiple persistence endpoints.

---

## Future Growth

```
capabilities/company/
├── feature.json
├── Application/
│   ├── Queries/
│   │   ├── GetOverview.php
│   │   ├── GetCompliance.php
│   │   └── GetFinancialSummary.php
│   └── Commands/
│       ├── UpdateProfile.php
│       ├── RegisterDirector.php
│       ├── DeactivateDirector.php
│       ├── UploadDocument.php
│       ├── ApproveCompany.php
│       └── ArchiveCompany.php
├── Contracts/
│   ├── CompanyOverviewResponse.php
│   ├── DirectorSummary.php
│   ├── FinancialSummary.php
│   ├── ComplianceSummary.php
│   ├── UpdateProfileRequest.php
│   ├── RegisterDirectorRequest.php
│   ├── DeactivateDirectorRequest.php
│   ├── UploadDocumentRequest.php
│   └── CommandResult.php
├── Infrastructure/
│   └── TransactionManager.php
└── README.md
```

The capability becomes the single place responsible for all company-related business operations — compliance, documents, directors, financial summary, verification status, risk rating.

---

## Migration Path

1. Create `capabilities/company/feature.json`
2. Create `capabilities/company/Contracts/` DTOs: `CompanyOverviewResponse`, `DirectorSummary`, `FinancialSummary`, `UpdateProfileRequest`, `RegisterDirectorRequest`, `DeactivateDirectorRequest`, `CommandResult`
3. Create `capabilities/company/Infrastructure/TransactionManager.php`
4. Create `capabilities/company/Application/Queries/GetOverview.php`
5. Create `capabilities/company/Application/Commands/UpdateProfile.php`, `RegisterDirector.php`, `DeactivateDirector.php`
6. Create `api/company/queries/get-overview.php` (thin controller)
7. Create `api/company/commands/update-profile.php`, `register-director.php`, `deactivate-director.php`
8. Create `src/services/company-capability.service.ts` on the frontend
9. Update `CompanyOverviewComponent` to use the new service and display directors
10. Keep legacy endpoints for backward compatibility
11. Remove legacy calls after verification
