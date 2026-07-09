# PHP Developer — Capability Builder

## Responsibilities

- PHP 8.1
- Business capabilities (use cases, not services)
- API endpoints (thin controllers — queries never write, commands always transactional)
- Database (repositories for companies, users, nodes, categories)
- DTOs for every contract
- Validation and business rules
- Refer to `docs/standards/capability-specification-v1.md` as the canonical architecture

## Golden Rules

- Backend owns business logic — never push business rules to Angular
- Every endpoint represents a business capability, not a database operation
- Use cases, not services — one class per business operation, one public method `execute()`
- Queries never modify state — no side effects, no transactions
- Commands always transactional — use `TransactionManager`, never `beginTransaction()` directly
- Controllers are thin — parse input, call use case, serialize response, no business logic
- Entity IDs come from the URL (`?id=N`), never from the request body
- DTOs for every contract — `*Request`, `*Response`, `*Summary`, `CommandResult`
- All DTO properties are `readonly`
- Repositories never call other repositories — only use cases orchestrate
- Every command returns `CommandResult` — `{success, message, data?, auditId?, warnings?}`
- Every capability has a `feature.json` manifest and an `AI.md` context file
- Every completed task updates: Code → Session → Sprint

## Architecture

```
api-incubator-os/
├── api/{capability}/                    ← Transport layer (thin controllers)
│   ├── queries/
│   │   └── get-{thing}.php             ← Delegates to a single use case
│   └── commands/
│       ├── {business-action}.php        ← Delegates to a single use case
│       └── ...
├── capabilities/
│   └── {capability}/
│       ├── feature.json                 ← Capability manifest
│       ├── AI.md                        ← AI context for agent sessions
│       ├── Application/
│       │   ├── Queries/
│       │   │   ├── Get{Thing}.php       ← Single use case class
│       │   │   └── ...
│       │   └── Commands/
│       │       ├── {BusinessAction}.php ← Single use case class
│       │       └── ...
│       ├── Contracts/
│       │   ├── Requests/
│       │   │   ├── {Action}Request.php  ← Command input DTO
│       │   │   └── ...
│       │   ├── Responses/
│       │   │   ├── {Thing}Response.php  ← Query output DTO
│       │   │   ├── CommandResult.php    ← Command output envelope
│       │   │   └── ...
│       │   └── Projections/
│       │       └── {Thing}Summary.php   ← Embedded projection DTO
│       ├── Repository/
│       │   └── {Entity}Repository.php   ← Data access
│       └── README.md
├── core/                                ← Shared platform infrastructure
│   └── Infrastructure/
│       └── TransactionManager.php       ← Shared across all capabilities
├── api-nodes/                           ← LEGACY: generic CRUD, untouched
└── models/                              ← LEGACY: PDO-based models, untouched
```

## Use Case Template

### Query (read-only, never modifies state)

```php
final class GetOverview
{
    public function __construct(
        private CompanyRepository $companyRepo,
        private UserRepository $userRepo,
    ) {}

    public function execute(int $companyId): CompanyOverviewResponse
    {
        $company = $this->companyRepo->getById($companyId);
        $directors = array_map(
            fn(array $u) => DirectorSummary::fromUser($u),
            $this->userRepo->listByCompany($companyId)
        );
        return new CompanyOverviewResponse(
            company: $company,
            directors: $directors,
        );
    }
}
```

### Command (always transactional)

```php
final class RegisterDirector
{
    public function __construct(
        private UserRepository $userRepo,
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
            return new CommandResult(
                success: true,
                message: 'Director registered successfully',
                data: DirectorSummary::fromUser($user),
            );
        });
    }
}
```

## Controller Template

```php
<?php
// api/{capability}/queries/get-{thing}.php

include_once '../../../config/Database.php';
include_once '../../../core/Infrastructure/TransactionManager.php';
include_once '../../../capabilities/{capability}/Contracts/Responses/CommandResult.php';
include_once '../../../capabilities/{capability}/Contracts/Responses/{Thing}Response.php';
include_once '../../../capabilities/{capability}/Contracts/Projections/{Thing}Summary.php';
include_once '../../../capabilities/{capability}/Contracts/Requests/{Action}Request.php';
include_once '../../../capabilities/{capability}/Application/Queries/Get{Thing}.php';
include_once '../../../capabilities/{capability}/Repository/{Entity}Repository.php';

$id = (int)($_GET['id'] ?? 0);
if (!$id) { http_response_code(400); echo json_encode(['error' => 'id is required']); exit; }

try {
    $db = (new Database())->connect();
    $result = (new GetOverview(
        new CompanyRepository($db),
        new UserRepository($db),
    ))->execute($id);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
```

## DTO Templates

### Response (query output)

```php
final class CompanyOverviewResponse
{
    public function __construct(
        public readonly array $company,
        public readonly array $directors,   // DirectorSummary[]
        public readonly ?array $financialSummary = null,
    ) {}
}
```

### Summary (embedded projection)

```php
final class DirectorSummary
{
    public function __construct(
        public readonly int $directorId,
        public readonly string $fullName,
        public readonly ?string $email,
        public readonly ?string $phone,
        public readonly string $role,
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
            gender: $user['gender'] ?? null,
            idNumber: $user['id_number'] ?? null,
        );
    }
}
```

### Request (command input)

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

### CommandResult

```php
final class CommandResult
{
    public function __construct(
        public readonly bool $success,
        public readonly string $message,
        public readonly mixed $data = null,
        public readonly ?string $auditId = null,
        public readonly array $warnings = [],
    ) {}
}
```

## TransactionManager (shared platform infrastructure)

```php
<?php
declare(strict_types=1);

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

## Capability Manifest (feature.json)

```json
{
  "name": "Company",
  "description": "Manage company profiles, directors, and financial overview",
  "queries": [
    { "name": "getOverview", "returns": "CompanyOverviewResponse" }
  ],
  "commands": [
    { "name": "registerDirector", "input": "RegisterDirectorRequest", "returns": "CommandResult" }
  ],
  "dependsOn": ["Users", "Financial"]
}
```

## Legacy Models (still available for repositories)

- `Company` — companies table (WRITABLE pattern, `getById()`, `update()`, etc.)
- `User` — users table (WRITABLE pattern, `add()`, `delete()`, `listByCompany()`, `getByUsername()`)
- `Node` — generic JSON node storage (`getById()`, `search()`, `update()`, `getConnection()`)
- `CategoryItem` — company-cohort assignments
- `CompanyFinancialYearlyStats` — m1-m12 monthly financial data

## Import/Undo Pattern

For operations that create companies from grant applications and need reversibility, see `GrantApplicationService` in `services/grant-applications/`.

## Startup Sequence

1. Read `docs/standards/capability-specification-v1.md`
2. Read Sprint (`.ai/sprints/Sprint-NN.md`)
3. Read Latest Session (`.ai/sessions/NNN-YYYY-MM-DD.md`)
4. Understand current task
5. Work
6. Update Session
7. Update Sprint if necessary