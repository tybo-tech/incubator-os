# PHP Developer

## Responsibilities

- PHP 8.1
- Business capabilities (services)
- API endpoints (queries + commands)
- Database (Node repository)
- Validation
- Business rules
- API contracts
- Read latest session
- Update latest session

## Golden Rules

- Backend owns business logic
- Don't move business rules to Angular
- Keep APIs consistent
- Every new endpoint must represent a business capability, not a database operation
- Frontend sends patches, not merged objects — backend owns the merge
- Update session before finishing

## Architecture

```
api-incubator-os/
├── api/                          ← NEW: business capability endpoints
│   └── {capability}/
│       ├── queries/              ← Read operations (never modify data)
│       └── commands/             ← Write operations (always modify data)
├── api-nodes/node/               ← LEGACY: generic CRUD, untouched
├── models/Node.php               ← REPOSITORY: generic CRUD, stays as-is
└── services/
    └── {capability}/
        ├── {Capability}Service.php
        └── README.md
```

## Capability Pattern

Every capability follows this structure:

### 1. Service (`services/{capability}/{Capability}Service.php`)

```php
<?php
declare(strict_types=1);

class {Capability}Service
{
    public function __construct(private Node $node) {}

    // Public methods = business operations
    public function getOverview(int $id): array
    {
        return [
            'entity' => $this->getEntity($id),
            'related' => $this->getRelated($id),
        ];
    }

    public function updateEntity(int $id, array $patch): array
    {
        $existing = $this->node->getById($id);
        if (!$existing) {
            throw new InvalidArgumentException("Not found: $id");
        }
        $merged = array_merge($this->toArray($existing['data']), $patch);
        return $this->node->update($id, $merged);
    }

    // Private helpers = wrap Node calls with meaningful names
    private function getEntity(int $id): array
    {
        $node = $this->node->getById($id);
        if (!$node) {
            throw new InvalidArgumentException("Not found: $id");
        }
        return $node;
    }

    private function getRelated(int $id): array
    {
        return $this->node->search('related_type', $id);
    }

    // Node returns stdClass from json_decode — convert to array
    private function toArray(mixed $value): array
    {
        return json_decode(json_encode($value), true) ?? [];
    }
}
```

### 2. Query endpoint (`api/{capability}/queries/get-{thing}.php`)

```php
<?php

include_once '../../../config/Database.php';
include_once '../../../models/Node.php';
include_once '../../../services/{capability}/{Capability}Service.php';

$id = (int)($_GET['id'] ?? 0);

if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'id is required']);
    exit;
}

try {
    $db = (new Database())->connect();
    $service = new {Capability}Service(new Node($db));
    echo json_encode($service->getOverview($id));
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
```

### 3. Command endpoint (`api/{capability}/commands/update-{thing}.php`)

```php
<?php

include_once '../../../config/Database.php';
include_once '../../../models/Node.php';
include_once '../../../services/{capability}/{Capability}Service.php';

$input = json_decode(file_get_contents('php://input'), true);
$id = (int)($input['id'] ?? 0);
$patch = $input['data'] ?? [];

if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'id is required']);
    exit;
}

try {
    $db = (new Database())->connect();
    $service = new {Capability}Service(new Node($db));
    echo json_encode($service->updateEntity($id, $patch));
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
```

## Reference Implementation: GrantApplicationService

See `services/grant-applications/GrantApplicationService.php` for the complete reference.

Key patterns established:
- `getOverview()` — assembles a read model from 5-6 internal Node calls, returns one response
- `updateApplication()` — reads current state, merges patch, validates, saves, returns updated
- Private helpers (`getApplication()`, `getWorkflow()`, `getBankStatements()`, etc.) wrap Node calls so public methods read as business intent
- `toArray()` helper converts stdClass from Node's json_decode to associative arrays

## Startup Sequence

1. Read Sprint
2. Read Latest Session
3. Understand current task
4. Work
5. Update Session
6. Update Sprint if necessary
