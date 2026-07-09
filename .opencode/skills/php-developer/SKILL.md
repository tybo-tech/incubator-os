# PHP Developer

## Responsibilities

- PHP 8.1
- Business capabilities (services)
- API endpoints (queries + commands)
- Database (Node repository, Company, CategoryItem)
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
- Every completed task updates: Code → Session → Sprint
- Update session before finishing

## Architecture

```
api-incubator-os/
├── api/                          ← NEW: business capability endpoints
│   └── {capability}/
│       ├── queries/              ← Read operations (never modify data)
│       └── commands/             ← Write operations (always modify data)
├── api-nodes/                    ← LEGACY: generic CRUD, untouched
│   ├── node/                     ← Node CRUD endpoints
│   ├── company/                  ← Company CRUD endpoints
│   └── category/                 ← Category/cohort endpoints
├── models/                       ← REPOSITORIES: generic CRUD, stays as-is
│   ├── Node.php                  ← Generic JSON node storage
│   ├── Company.php               ← Companies table (WRITABLE pattern)
│   ├── Categories.php           ← Category hierarchy (client/program/cohort)
│   └── CategoryItem.php         ← Company-cohort assignments
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
    private Node $node;
    private ?Company $company = null;
    private ?CategoryItem $categoryItem = null;

    public function __construct(Node $node)
    {
        $this->node = $node;
    }

    private function getCompany(): Company
    {
        if (!$this->company) {
            $this->company = new Company($this->node->getConnection());
        }
        return $this->company;
    }

    private function getCategoryItem(): CategoryItem
    {
        if (!$this->categoryItem) {
            $this->categoryItem = new CategoryItem($this->node->getConnection());
        }
        return $this->categoryItem;
    }

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

## Import/Undo Pattern

For operations that create companies from nodes and need reversibility:

```php
// Import: create/update companies, set company_id, attach to cohort
public function executeImportToCompanies(?int $cohortId = null, ?string $statusFilter = null): array
{
    $dryRun = $this->dryRunImportToCompanies($statusFilter);
    foreach ($dryRun['results'] as $item) {
        $isExisting = $item['status'] === 'exists';
        if ($isExisting) {
            $company->update($companyId, $item['mapped_data']);
        } else {
            $created = $company->add($item['mapped_data']);
            $this->node->updateCompanyId((int)$item['node_id'], $companyId);
        }
        // Store flag on node for undo
        $this->node->patchNodeData((int)$item['node_id'], [
            'is_existing_company' => $isExisting,
            'last_action' => 'imported',
            'last_action_at' => date('c'),
        ]);
        // Attach to cohort
        $this->getCategoryItem()->attachCompany($cohortId, $companyId);
    }
}

// Undo: detach from cohort, clear company_id, delete only new companies
public function undoImportToCompanies(int $cohortId): array
{
    $companies = $this->getCategoryItem()->getCompaniesInCohort($cohortId);
    foreach ($companies as $entry) {
        // Check is_existing_company flag BEFORE clearing
        $applications = $this->node->search('grant_application', null, $companyId);
        $isExisting = check flag in app data;
        $this->getCategoryItem()->detachCompany($cohortId, $companyId);
        $this->node->clearCompanyId($companyId);
        if (!$isExisting) {
            $company->delete($companyId);
        }
    }
}
```

## Category Hierarchy

```
categories table: id, name, type, parent_id, depth
  type: 'client' (depth 1) → 'program' (depth 2) → 'cohort' (depth 3)

categories_item table: links companies to cohorts
  cohort_id, program_id, client_id, company_id, status, joined_at
```

Key methods in `CategoryItem`:
- `attachCompany(cohortId, companyId)` — adds company to cohort (prevents duplicates)
- `detachCompany(cohortId, companyId)` — removes from cohort
- `getCompaniesInCohort(cohortId)` — list companies with assignment details
- `getCompanyParticipation(companyId)` — all cohorts for a company

## Node Model Extensions

```php
// Added to Node.php for import/undo support:
public function getConnection()          // Expose PDO for other models
public function updateCompanyId(id, companyId)  // Set company_id on node
public function clearCompanyId(companyId)       // Nullify company_id on all nodes
public function patchNodeData(id, patch)        // Merge data into node's JSON
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
