<?php
declare(strict_types=1);

class Industry
{
    private PDO $conn;

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /* ============================ Create / Update ============================ */

    public function add(string $name, ?int $parentId = null, array $extraFields = []): array
    {
        $allowedFields = [
            'description', 'notes', 'image_url', 'icon_class',
            'color_theme', 'background_theme', 'tags', 'is_active',
            'display_order', 'created_by'
        ];

        $fields = ['name', 'parent_id'];
        $values = [$name, $parentId];
        $placeholders = ['?', '?'];

        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $extraFields)) {
                $fields[] = $field;
                $values[] = $extraFields[$field];
                $placeholders[] = '?';
            }
        }

        $sql = "INSERT INTO industries (" . implode(', ', $fields) . ") VALUES (" . implode(', ', $placeholders) . ")";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($values);

        return $this->getById((int)$this->conn->lastInsertId());
    }

    public function update(int $id, array $fields): ?array
    {
        $allowed = [
            'name', 'parent_id', 'description', 'notes', 'image_url',
            'icon_class', 'color_theme', 'background_theme', 'tags',
            'is_active', 'display_order', 'created_by'
        ];
        $sets = [];
        $params = [];

        foreach ($allowed as $k) {
            if (array_key_exists($k, $fields)) {
                $sets[] = "$k = ?";
                $params[] = $fields[$k];
            }
        }
        if (!$sets) return $this->getById($id);

        $params[] = $id;
        $sql = "UPDATE industries SET " . implode(', ', $sets) . ", updated_at = NOW() WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return $this->getById($id);
    }

    /* ================================ Read ================================= */

    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM industries WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    public function getByName(string $name): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM industries WHERE name = ?");
        $stmt->execute([$name]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    /**
     * Enhanced list with pagination, filtering, and search
     * @param array $opts Options: parent_id, is_active, search, page, limit, order_by, order_dir
     * @return array ['data' => [...], 'total' => int, 'page' => int, 'limit' => int]
     */
    public function list(array $opts = []): array
    {
        $where = [];
        $params = [];
        $countParams = [];

        // Build WHERE conditions
        if (array_key_exists('parent_id', $opts)) {
            if ($opts['parent_id'] === null) {
                $where[] = "parent_id IS NULL";
            } else {
                $where[] = "parent_id = ?";
                $params[] = (int)$opts['parent_id'];
                $countParams[] = (int)$opts['parent_id'];
            }
        }

        if (array_key_exists('is_active', $opts) && $opts['is_active'] !== null) {
            $where[] = "is_active = ?";
            $params[] = (bool)$opts['is_active'] ? 1 : 0;
            $countParams[] = (bool)$opts['is_active'] ? 1 : 0;
        }

        if (!empty($opts['search'])) {
            $where[] = "(name LIKE ? OR description LIKE ? OR notes LIKE ?)";
            $searchTerm = '%' . $opts['search'] . '%';
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $countParams[] = $searchTerm;
            $countParams[] = $searchTerm;
            $countParams[] = $searchTerm;
        }

        $whereClause = $where ? " WHERE " . implode(' AND ', $where) : "";

        // Get total count
        $countSql = "SELECT COUNT(*) as total FROM industries" . $whereClause;
        $countStmt = $this->conn->prepare($countSql);
        $countStmt->execute($countParams);
        $total = (int)$countStmt->fetch(PDO::FETCH_ASSOC)['total'];

        // Build main query
        $orderBy = $opts['order_by'] ?? 'display_order';
        $orderDir = strtoupper($opts['order_dir'] ?? 'ASC');
        if (!in_array($orderDir, ['ASC', 'DESC'])) $orderDir = 'ASC';

        $allowedOrderFields = ['id', 'name', 'display_order', 'created_at', 'updated_at'];
        if (!in_array($orderBy, $allowedOrderFields)) $orderBy = 'display_order';

        $sql = "SELECT * FROM industries" . $whereClause . " ORDER BY $orderBy $orderDir, name ASC";

        // Add pagination
        $page = max(1, (int)($opts['page'] ?? 1));
        $limit = max(1, min(1000, (int)($opts['limit'] ?? 50))); // Max 1000 per page
        $offset = ($page - 1) * $limit;

        $sql .= " LIMIT ? OFFSET ?";
        $params[] = $limit;
        $params[] = $offset;

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        $data = [];
        while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $data[] = $this->castRow($r);
        }

        return [
            'data' => $data,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'pages' => ceil($total / $limit)
        ];
    }

    /** Children of a given industry. */
    public function listChildren(int $parentId): array
    {
        return $this->list(['parent_id' => $parentId])['data'];
    }

    /** Get industries with hierarchy information (children count, companies count, etc.) */
    public function listWithHierarchy(array $opts = []): array
    {
        $result = $this->list($opts);

        // Add hierarchy information to each industry
        foreach ($result['data'] as &$industry) {
            $industry['children_count'] = $this->getChildrenCount($industry['id']);
            $industry['companies_count'] = $this->getCompaniesCount($industry['id']);
            $industry['depth'] = $this->getDepth($industry['id']);

            // Add parent information if requested
            if (!empty($opts['include_parent']) && $industry['parent_id']) {
                $industry['parent'] = $this->getById($industry['parent_id']);
            }

            // Add children if requested
            if (!empty($opts['include_children'])) {
                $industry['children'] = $this->listChildren($industry['id']);
            }
        }

        return $result;
    }

    /** Get count of direct children */
    public function getChildrenCount(int $industryId): int
    {
        $stmt = $this->conn->prepare("SELECT COUNT(*) as count FROM industries WHERE parent_id = ? AND is_active = 1");
        $stmt->execute([$industryId]);
        return (int)$stmt->fetch(PDO::FETCH_ASSOC)['count'];
    }

    /** Get count of companies in this industry */
    public function getCompaniesCount(int $industryId): int
    {
        // Assuming companies table has industry_id field
        $stmt = $this->conn->prepare("SELECT COUNT(*) as count FROM companies WHERE industry_id = ?");
        $stmt->execute([$industryId]);
        return (int)$stmt->fetch(PDO::FETCH_ASSOC)['count'];
    }

    /** Get depth level in hierarchy (0 = root, 1 = first level child, etc.) */
    public function getDepth(int $industryId): int
    {
        $industry = $this->getById($industryId);
        if (!$industry || !$industry['parent_id']) {
            return 0;
        }
        return 1 + $this->getDepth($industry['parent_id']);
    }

    /** Simple in-memory tree: [{id,name,parent_id,children:[...]}] */
    public function listTree(): array
    {
        $stmt = $this->conn->query("SELECT * FROM industries ORDER BY name ASC");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $byId = [];
        foreach ($rows as $r) {
            $r = $this->castRow($r);
            $r['children'] = [];
            $byId[$r['id']] = $r;
        }
        $roots = [];
        foreach ($byId as $id => &$node) {
            if ($node['parent_id'] === null) {
                $roots[] = &$node;
            } else {
                if (isset($byId[$node['parent_id']])) {
                    $byId[$node['parent_id']]['children'][] = &$node;
                } else {
                    // Orphaned node → treat as root
                    $roots[] = &$node;
                }
            }
        }
        return $roots;
    }

    /* ================================ Delete ================================ */

    public function delete(int $id): bool
    {
        // FK behavior:
        // - industries.parent_id → ON DELETE SET NULL (children become roots)
        // - companies.industry_id → ON DELETE SET NULL (companies disassociate)
        $stmt = $this->conn->prepare("DELETE FROM industries WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    /* ============================= Conveniences ============================= */

    /** Idempotent create by name; returns existing if present. */
    public function ensure(string $name, ?int $parentId = null): array
    {
        $existing = $this->getByName($name);
        if ($existing) return $existing;

        return $this->add($name, $parentId);
    }

    /** Ensure with parent specified by name (creates parent if missing). */
    public function ensureWithParent(string $name, ?string $parentName): array
    {
        $parentId = null;
        if ($parentName) {
            $parent = $this->ensure($parentName, null);
            $parentId = $parent['id'];
        }
        return $this->ensure($name, $parentId);
    }

    /** Reassign all companies currently pointing at $fromId → $toId (or NULL). */
    public function reassignCompanies(int $fromId, ?int $toId): int
    {
        $stmt = $this->conn->prepare("UPDATE companies SET industry_id = ? WHERE industry_id = ?");
        $stmt->execute([$toId, $fromId]);
        return $stmt->rowCount();
    }

    /* ================================= Utils ================================ */

    private function castRow(array $row): array
    {
        // Cast integer fields
        foreach (['id', 'parent_id', 'is_active', 'display_order', 'created_by'] as $k) {
            if (array_key_exists($k, $row) && $row[$k] !== null) {
                $row[$k] = (int)$row[$k];
            } else {
                $row[$k] = $row[$k] === null ? null : $row[$k];
            }
        }

        // Cast boolean fields
        if (isset($row['is_active'])) {
            $row['is_active'] = (bool)$row['is_active'];
        }

        // Parse JSON fields
        if (isset($row['tags']) && $row['tags']) {
            $row['tags'] = json_decode($row['tags'], true);
        }

        return $row;
    }
}
