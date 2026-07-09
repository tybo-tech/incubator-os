# Capability Specification v1.0

> Platform standard for all backend capabilities. Every new capability must conform to this structure. Deviations must be deliberate, documented, and justified.

---

## 1. Directory Structure

```
api-incubator-os/
├── api/{capability}/                    ← Transport layer (thin controllers)
│   ├── queries/
│   │   └── get-{thing}.php             ← Delegates to a single use case
│   └── commands/
│       ├── {business-action}.php        ← Delegates to a single use case
│       └── ...
└── capabilities/
    └── {capability}/
        ├── feature.json                 ← Capability manifest
        ├── AI.md                        ← AI context for agent sessions
        ├── Application/
        │   ├── Queries/
        │   │   ├── Get{Thing}.php       ← Single use case class
        │   │   └── ...
        │   └── Commands/
        │       ├── {BusinessAction}.php ← Single use case class
        │       └── ...
        ├── Contracts/
        │   ├── Requests/
        │   │   ├── {Action}Request.php  ← Command input DTO
        │   │   └── ...
        │   ├── Responses/
        │   │   ├── {Thing}Response.php  ← Query output DTO
        │   │   ├── CommandResult.php    ← Command output envelope
        │   │   └── ...
        │   └── Projections/
        │       ├── {Thing}Summary.php   ← Embedded projection DTO
        │       └── ...
        ├── Domain/
        │   └── ...                      ← Domain models (if needed)
        ├── Repository/
        │   ├── {Entity}Repository.php   ← Data access interface/class
        │   └── ...
        └── README.md
```

---

## 2. Rules

### 2.1 Architecture

| Layer | Responsibility | Must Not |
|---|---|---|
| Controller (`api/`) | Parse HTTP input, call use case, serialize response | Contain business logic, construct dependencies manually |
| Use Case (`Application/`) | Execute one business operation, orchestrate repositories | Call other use cases, know about HTTP |
| Repository (`Repository/`) | Persistence for one aggregate | Call other repositories |
| DTO (`Contracts/`) | Define input/output contracts | Contain logic beyond construction |
| Manifest (`feature.json`) | Declare capability metadata | Be stale |

### 2.2 Use Cases

- Every use case has exactly **one public method**: `execute()`
- Query use cases: `execute(...): {Thing}Response` — **never modify state**
- Command use cases: `execute(...): CommandResult` — **always transactional**
- Use cases receive dependencies via constructor injection
- Use cases never call `beginTransaction()`/`commit()`/`rollback()` directly — use `TransactionManager`

### 2.3 DTOs

- All DTO properties are `readonly`
- `{Action}Request` — command input, validated before use
- `{Thing}Response` — query output, returned as JSON
- `{Thing}Summary` — projection embedded inside a response
- `CommandResult` — every command returns `{success, message, data?, auditId?, warnings?}`

### 2.4 Controllers

- `GET` for queries, `POST` for commands
- Entity IDs come from the URL (`?id=N`), never from the request body
- Controllers must not construct their own dependencies — use a composition root or factory

### 2.5 Repositories

- One repository per aggregate root
- Repositories never call other repositories
- Repositories return domain objects, not raw arrays

### 2.6 Transactions

```php
// Platform infrastructure — shared across all capabilities
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

### 2.7 Naming

| Concept | Convention | Example |
|---|---|---|
| Query use case | `Get{Thing}` | `GetOverview` |
| Command use case | `{BusinessAction}` | `RegisterDirector` |
| Query response | `{Thing}Response` | `CompanyOverviewResponse` |
| Command request | `{Action}Request` | `RegisterDirectorRequest` |
| Projection | `{Thing}Summary` | `DirectorSummary` |
| Command output | `CommandResult` | `CommandResult` |
| Controller file | `{business-action}.php` | `register-director.php` |
| Use case method | `execute()` | `execute()` |

---

## 3. Template: Query Use Case

```php
final class GetOverview
{
    public function __construct(
        private CompanyRepository $companyRepo,
        private UserRepository $userRepo,
    ) {}

    public function execute(int $companyId): CompanyOverviewResponse
    {
        return new CompanyOverviewResponse(
            company: $this->companyRepo->getById($companyId),
            directors: array_map(
                fn($u) => DirectorSummary::fromUser($u),
                $this->userRepo->listByCompany($companyId)
            ),
        );
    }
}
```

---

## 4. Template: Command Use Case

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
            $user = $this->userRepo->create([...]);
            return new CommandResult(
                success: true,
                message: 'Director registered',
                data: DirectorSummary::fromUser($user),
            );
        });
    }
}
```

---

## 5. Template: Controller

```php
<?php
// api/{capability}/queries/get-{thing}.php

include_once '../../../config/Database.php';
include_once '../../../core/Infrastructure/TransactionManager.php';
// ... include all needed contracts, use cases, repositories

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

---

## 6. Template: `feature.json`

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

---

## 7. Template: `AI.md`

```markdown
# {Capability} — AI Context

## Purpose
What this capability does.

## Dependencies
- {Dependency} — why

## Queries
- `getOverview(id)` → `CompanyOverviewResponse`

## Commands
- `registerDirector(companyId, request)` → `CommandResult`

## Business Rules
- {rule}

## Important DTOs
- `{Dto}` — {purpose}

## Extension Points
- {future hook}
```

---

## 8. Platform Standards Summary

1. Thin controllers — no business logic
2. Use cases, not services — one class per operation
3. `execute()` — the single method name
4. DTOs for every contract — `*Request`, `*Response`, `*Summary`, `CommandResult`
5. Immutable DTOs — all properties `readonly`
6. Queries never modify state — no side effects, no transactions
7. Commands return `CommandResult` — `{success, message, data?, auditId?, warnings?}`
8. Entity IDs from the URL — not the request body
9. `TransactionManager` abstraction — use cases don't manage transactions
10. Repositories never call other repositories — only use cases orchestrate
11. `feature.json` manifest — every capability is discoverable
12. `AI.md` — every capability has an AI context file