# Node Service & API — Architecture

## Data Flow

```
Angular (NodeService)  ──HTTP──>  PHP Endpoints  ──>  Node Model  ──>  MySQL (nodes table)
```

## Frontend: `src/services/node.service.ts`

Generic CRUD service (`NodeService<T>`) with these methods:

| Method | HTTP | PHP Endpoint |
|---|---|---|
| `getAllNodes()` | GET | `get-all-nodes.php` |
| `getNodeById(id)` | GET | `get-node.php?nodeId=` |
| `getNodes(type, parentId, companyId, ...)` | GET | `get-nodes.php` (filtered search) |
| `getBySubmittedByName(name, type?, parentId?)` | GET | `get-nodes-by-submitted-by.php` |
| `getNodesByType(type)` | GET | `get-nodes-by-type.php` |
| `getNodesByCompany(companyId, type?)` | GET | `get-nodes-by-company.php` |
| `addNode(node)` | POST | `add-node.php` |
| `updateNode(node)` | PUT | `update-node.php` |
| `saveNode(node)` | auto | delegates to add/update based on `node.id` |
| `deleteNode(nodeId)` | DELETE | `delete-node.php?nodeId=` |
| `addNodesBatch(nodes)` | POST | `add-nodes-batch.php` |
| `updateNodesBatch(nodes)` | PUT | `update-nodes-batch.php` |

**Helpers**: `cleanDataForSave` (strips `__`-prefixed hydrated fields), `ensureMultiSelectArrays`, `getDisplayValue`, `isRelationshipField`, `getHydratedData`, `parseMoneyRaw`, `round2`.

## Backend: `api-incubator-os/api-nodes/node/`

12 PHP files, all following the same pattern:
1. Include `Database.php` + `Node.php`
2. Parse input (GET params or JSON body)
3. Call `Node` model method
4. Return JSON (or 400/404 on error)

## Model: `api-incubator-os/models/Node.php`

`Node` class with PDO-based methods:

| Method | SQL | Notes |
|---|---|---|
| `add(type, data, companyId, parentId, createdBy, submittedByName)` | INSERT | `data` stored as JSON |
| `update(id, data, updatedBy)` | UPDATE | Only updates `data`, `updated_by`, `updated_at` |
| `getById(id)` | SELECT | Decodes `data` JSON |
| `getByType(type)` | SELECT WHERE type= | |
| `getByCompanyId(companyId, type?)` | SELECT WHERE company_id= | Optional type filter |
| `search(type?, parentId?, companyId?, submittedByName?, createdBy?)` | SELECT with dynamic WHERE | All params optional |
| `delete(id)` | DELETE | |
| `getBySubmittedByName(name, type?, parentId?)` | SELECT WHERE submitted_by_name= | |
| `addRange(items)` | Transactional batch INSERT | |
| `updateRange(items)` | Transactional batch UPDATE | |

## Schema: `INode<T>` (TypeScript)

```ts
{
  id?: number;
  type: string;
  data: T;
  company_id?: number | null;
  parent_id?: number | null;
  created_by?: number | null;
  updated_by?: number | null;
  created_at?: string;
  updated_at?: string;
}
```

## Key Observations

- **`data` is a JSON column** — all dynamic/type-specific fields live inside `data`
- **`add-form-definition.php` is empty** — likely a placeholder
- **`MetaValueSyncService` is commented out** in `add`, `update`, and `delete` — flat meta sync is disabled
- **No hydration logic** in the PHP model — relationship hydration (`__` prefixed fields) must happen elsewhere or not at all on the backend
- **`add-node.php`** passes `submitted_by_name` as a top-level param (not inside `data`), matching the DB column
- **`update-node.php`** only updates `data`, `updated_by`, `updated_at` — it does **not** update `type`, `company_id`, `parent_id`, or `submitted_by_name`
