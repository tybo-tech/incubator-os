<?php
declare(strict_types=1);

final class Categories
{
    private PDO $conn;

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /* =========================================================================
       CREATE / UPDATE
       ========================================================================= */

    /**
     * Create a category node (client/program/cohort/metric).
     * Enforces depth and parent rules in-app (DB has no FKs/UNIQUE now).
     */
    public function addCategory(
        string $name,
        string $type,                           // 'client' | 'program' | 'cohort' | 'metric'
        ?int $parentId = null,
        ?string $description = null,
        ?string $imageUrl = null
    ): array {
        $type  = strtolower($type);
        $depth = $this->inferDepth($type);
        $this->assertHierarchy($type, $parentId, $depth);

        $sql = "INSERT INTO categories (name, type, description, image_url, parent_id, depth)
                VALUES (?, ?, ?, ?, ?, ?)";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$name, $type, $description, $imageUrl, $parentId, $depth]);

        return $this->getCategoryById((int)$this->conn->lastInsertId());
    }

    /**
     * Update a category (safe allow-list).
     */
    public function updateCategory(int $id, array $fields): ?array
    {
        $allowed = ['name','description','image_url','parent_id','type'];
        $current = $this->getCategoryById($id);
        if (!$current) return null;

        $nextType   = isset($fields['type']) ? strtolower((string)$fields['type']) : $current['type'];
        $nextParent = array_key_exists('parent_id', $fields) ? ($fields['parent_id'] ?? null) : $current['parent_id'];
        $nextDepth  = $this->inferDepth($nextType);

        $this->assertHierarchy($nextType, $nextParent, $nextDepth);

        $sets = [];
        $params = [];
        foreach ($allowed as $k) {
            if (array_key_exists($k, $fields)) {
                $sets[]   = "$k = ?";
                $params[] = $fields[$k];
            }
        }
        if (!$sets) return $current;

        $params[] = $id;
        $sql = "UPDATE categories SET ".implode(', ', $sets).", updated_at = NOW() WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return $this->getCategoryById($id);
    }

    /* =========================================================================
       READ - CATEGORIES
       ========================================================================= */

    public function getCategoryById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM categories WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castCategory($row) : null;
    }

    /**
     * Find by name/type under a specific parent (or root when parentId null).
     */
    public function getByNameUnderParent(string $name, string $type, ?int $parentId): ?array
    {
        $type = strtolower($type);
        $q = "SELECT * FROM categories WHERE name = ? AND type = ?";
        $p = [$name, $type];

        if ($parentId === null) {
            $q .= " AND parent_id IS NULL";
        } else {
            $q .= " AND parent_id = ?";
            $p[] = $parentId;
        }
        $q .= " LIMIT 1";

        $stmt = $this->conn->prepare($q);
        $stmt->execute($p);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castCategory($row) : null;
    }

    /**
     * List categories by optional filters: type, parent_id, depth.
     */
    public function listCategories(array $opts = []): array
    {
        $where = [];
        $params = [];

        if (!empty($opts['type'])) {
            $where[] = "type = ?";
            $params[] = strtolower((string)$opts['type']);
        }
        if (array_key_exists('parent_id', $opts)) {
            if ($opts['parent_id'] === null) {
                $where[] = "parent_id IS NULL";
            } else {
                $where[] = "parent_id = ?";
                $params[] = (int)$opts['parent_id'];
            }
        }
        if (!empty($opts['depth'])) {
            $where[] = "depth = ?";
            $params[] = (int)$opts['depth'];
        }

        $sql = "SELECT * FROM categories";
        if ($where) $sql .= " WHERE ".implode(' AND ', $where);
        $sql .= " ORDER BY name ASC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        $out = [];
        while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $out[] = $this->castCategory($r);
        }
        return $out;
    }

    public function listChildren(int $parentId, ?string $type = null): array
    {
        $opts = ['parent_id' => $parentId];
        if ($type) $opts['type'] = strtolower($type);
        return $this->listCategories($opts);
    }

    /**
     * Simple tree (client → program → cohort).
     */
    public function listTree(): array
    {
        $stmt = $this->conn->query("SELECT * FROM categories ORDER BY depth ASC, name ASC");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $byId = [];
        foreach ($rows as $r) {
            $r = $this->castCategory($r);
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
                    $roots[] = &$node; // orphan safety
                }
            }
        }
        return $roots;
    }

    /* Convenience fetchers */
    public function listProgramsForClient(int $clientId): array
    {
        return $this->listCategories(['parent_id' => $clientId, 'type' => 'program', 'depth' => 2]);
    }

    public function listCohortsForProgram(int $programId): array
    {
        return $this->listCategories(['parent_id' => $programId, 'type' => 'cohort', 'depth' => 3]);
    }

    public function listMetricCategories(): array
    {
        return $this->listCategories(['type' => 'metric', 'depth' => 1]);
    }

    /* =========================================================================
       MEMBERSHIPS (companies <-> categories_item)
       ========================================================================= */

    /**
     * Attach company to a category (should be a cohort).
     * Using INSERT IGNORE pattern to avoid duplicates while UNIQUE is removed.
     */
    public function attachCompany(int $categoryId, int $companyId): array
    {
        // Optional: sanity check that category is a cohort
        $cat = $this->getCategoryById($categoryId);
        if (!$cat || $cat['depth'] !== 3 || $cat['type'] !== 'cohort') {
            throw new InvalidArgumentException("attachCompany: category must be an existing cohort");
        }

        $sql = "INSERT INTO categories_item (category_id, company_id)
                VALUES (?, ?)";
        try {
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$categoryId, $companyId]);
        } catch (PDOException $e) {
            // If you later add UNIQUE(category_id, company_id), duplicate inserts will throw here.
            // For now, we silently allow duplicates or handle as needed.
        }

        return ['category_id' => $categoryId, 'company_id' => $companyId];
    }

    public function detachCompany(int $categoryId, int $companyId): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM categories_item WHERE category_id = ? AND company_id = ?");
        $stmt->execute([$categoryId, $companyId]);
        return $stmt->rowCount() > 0;
    }

    public function listCompaniesInCohort(int $cohortCategoryId): array
    {
        $sql = "SELECT co.*
                FROM companies co
                JOIN categories_item ci ON ci.company_id = co.id
                WHERE ci.category_id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$cohortCategoryId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function listCompaniesInProgram(int $programCategoryId): array
    {
        $sql = "SELECT DISTINCT co.*
                FROM companies co
                JOIN categories_item ci ON ci.company_id = co.id
                JOIN categories h ON h.id = ci.category_id AND h.type='cohort' AND h.depth=3
                WHERE h.parent_id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$programCategoryId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function listCompaniesUnderClient(int $clientCategoryId): array
    {
        $sql = "SELECT DISTINCT co.*
                FROM companies co
                JOIN categories_item ci ON ci.company_id = co.id
                JOIN categories h ON h.id = ci.category_id AND h.type='cohort' AND h.depth=3
                JOIN categories p ON p.id = h.parent_id AND p.type='program' AND p.depth=2
                WHERE p.parent_id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$clientCategoryId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /* =========================================================================
       DELETE
       ========================================================================= */

    public function deleteCategory(int $id): bool
    {
        // Since you dropped FKs, manually clean up children & items if desired:
        // 1) Reparent or delete children
        $this->deleteChildrenCascade($id);

        // 2) Delete memberships
        $stmt = $this->conn->prepare("DELETE FROM categories_item WHERE category_id = ?");
        $stmt->execute([$id]);

        // 3) Delete node
        $stmt = $this->conn->prepare("DELETE FROM categories WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    private function deleteChildrenCascade(int $parentId): void
    {
        $children = $this->listChildren($parentId);
        foreach ($children as $child) {
            $this->deleteCategory((int)$child['id']);
        }
    }

    /* =========================================================================
       HELPERS / ENSURE / BREADCRUMBS
       ========================================================================= */

    public function ensureClient(string $name, ?string $description = null, ?string $imageUrl = null): array
    {
        $existing = $this->getByNameUnderParent($name, 'client', null);
        if ($existing) return $existing;
        return $this->addCategory($name, 'client', null, $description, $imageUrl);
    }

    public function ensureProgram(int $clientId, string $name, ?string $description = null, ?string $imageUrl = null): array
    {
        $existing = $this->getByNameUnderParent($name, 'program', $clientId);
        if ($existing) return $existing;
        return $this->addCategory($name, 'program', $clientId, $description, $imageUrl);
    }

    public function ensureCohort(int $programId, string $name, ?string $description = null, ?string $imageUrl = null): array
    {
        $existing = $this->getByNameUnderParent($name, 'cohort', $programId);
        if ($existing) return $existing;
        return $this->addCategory($name, 'cohort', $programId, $description, $imageUrl);
    }

    public function ensureMetricCategory(string $name, ?string $description = null, ?string $imageUrl = null): array
    {
        $existing = $this->getByNameUnderParent($name, 'metric', null);
        if ($existing) return $existing;
        return $this->addCategory($name, 'metric', null, $description, $imageUrl);
    }

    /**
     * Breadcrumb for top bar chips: [client, program, cohort]
     */
    public function breadcrumb(int $categoryId): array
    {
        $trail = [];
        $current = $this->getCategoryById($categoryId);
        while ($current) {
            $trail[] = [
                'id'    => $current['id'],
                'name'  => $current['name'],
                'type'  => $current['type'],
                'depth' => $current['depth']
            ];
            if ($current['parent_id'] === null) break;
            $current = $this->getCategoryById((int)$current['parent_id']);
        }
        return array_reverse($trail);
    }

    public function moveCategory(int $categoryId, ?int $newParentId): ?array
    {
        $cat = $this->getCategoryById($categoryId);
        if (!$cat) return null;

        $this->assertHierarchy($cat['type'], $newParentId, $cat['depth']);

        $stmt = $this->conn->prepare("UPDATE categories SET parent_id = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$newParentId, $categoryId]);

        return $this->getCategoryById($categoryId);
    }

    /* =========================================================================
       INTERNAL: hierarchy + casting
       ========================================================================= */

    private function inferDepth(string $type): int
    {
        return match (strtolower($type)) {
            'client'  => 1,
            'program' => 2,
            'cohort'  => 3,
            'metric'  => 1,  // Metric categories are top-level like clients
            default   => throw new InvalidArgumentException("Unknown category type: $type")
        };
    }

    private function assertHierarchy(string $type, ?int $parentId, int $depth): void
    {
        if ($type === 'client') {
            if ($parentId !== null || $depth !== 1) {
                throw new InvalidArgumentException("Client must have no parent and depth=1");
            }
            return;
        }

        if ($type === 'metric') {
            if ($parentId !== null || $depth !== 1) {
                throw new InvalidArgumentException("Metric must have no parent and depth=1");
            }
            return;
        }

        if ($parentId === null) {
            throw new InvalidArgumentException("Non-root category requires a parent_id");
        }

        $parent = $this->getCategoryById($parentId);
        if (!$parent) {
            throw new InvalidArgumentException("Parent category not found: $parentId");
        }

        if ($type === 'program') {
            if (!($parent['type'] === 'client' && $parent['depth'] === 1 && $depth === 2)) {
                throw new InvalidArgumentException("Program must have parent type=client depth=1 and depth=2");
            }
            return;
        }

        if ($type === 'cohort') {
            if (!($parent['type'] === 'program' && $parent['depth'] === 2 && $depth === 3)) {
                throw new InvalidArgumentException("Cohort must have parent type=program depth=2 and depth=3");
            }
            return;
        }

        throw new InvalidArgumentException("Invalid hierarchy for type=$type");
    }

    /* =========================================================================
       COMPANY-COHORT INTEGRATION
       ========================================================================= */

    /**
     * Attach a company to a cohort (delegates to CategoryItem model)
     */
    public function attachCompanyToCohort(
        int $cohortId,
        int $companyId,
        ?int $addedByUserId = null,
        ?string $notes = null
    ): array {
        include_once __DIR__ . '/CategoryItem.php';
        $categoryItem = new CategoryItem($this->conn);
        return $categoryItem->attachCompany($cohortId, $companyId, $addedByUserId, $notes);
    }

    /**
     * Bulk attach multiple companies to a cohort (delegates to CategoryItem model)
     */
    public function bulkAttachCompaniesToCohort(
        int $cohortId,
        array $companyIds,
        ?int $addedByUserId = null,
        ?string $notes = null
    ): array {
        include_once __DIR__ . '/CategoryItem.php';
        $categoryItem = new CategoryItem($this->conn);
        return $categoryItem->bulkAttachCompanies($cohortId, $companyIds, $addedByUserId, $notes);
    }

    /**
     * Detach a company from a cohort (delegates to CategoryItem model)
     */
    public function detachCompanyFromCohort(int $cohortId, int $companyId): bool
    {
        include_once __DIR__ . '/CategoryItem.php';
        $categoryItem = new CategoryItem($this->conn);
        return $categoryItem->detachCompany($cohortId, $companyId);
    }

    /**
     * List companies in a cohort (delegates to CategoryItem model)
     */
    public function getCompaniesInCohort(int $cohortId, ?string $status = null): array
    {
        include_once __DIR__ . '/CategoryItem.php';
        $categoryItem = new CategoryItem($this->conn);
        return $categoryItem->getCompaniesInCohort($cohortId, $status);
    }

    /**
     * List companies in a cohort with full details (delegates to CategoryItem model)
     */
    public function getCompaniesInCohortDetailed(int $cohortId, ?string $status = null): array
    {
        include_once __DIR__ . '/CategoryItem.php';
        $categoryItem = new CategoryItem($this->conn);
        return $categoryItem->getCompaniesInCohortDetailed($cohortId, $status);
    }

    /**
     * Get enhanced statistics for a category using CategoryItem data
     */
    public function getCategoryStatistics(int $categoryId): array
    {
        $category = $this->getCategoryById($categoryId);
        if (!$category) {
            throw new InvalidArgumentException("Category {$categoryId} not found");
        }

        include_once __DIR__ . '/CategoryItem.php';
        $categoryItem = new CategoryItem($this->conn);
        return $categoryItem->getCategoryStatistics($categoryId, $category['type']);
    }

    private function castCategory(array $row): array
    {
        foreach (['id','parent_id','depth'] as $k) {
            if (array_key_exists($k, $row) && $row[$k] !== null) {
                $row[$k] = (int)$row[$k];
            } else {
                $row[$k] = $row[$k] === null ? null : $row[$k];
            }
        }
        // keep other fields as-is
        return $row;
    }

    /* =========================================================================
       METRIC TYPE CATEGORY RELATIONSHIPS
       ========================================================================= */

    /**
     * Get categories associated with a specific metric type
     */
    public function getMetricTypeCategories(int $metricTypeId): array
    {
        $sql = "SELECT c.* FROM categories c
                INNER JOIN metric_type_categories mtc ON c.id = mtc.category_id
                WHERE mtc.metric_type_id = ?
                ORDER BY c.name";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$metricTypeId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map([$this, 'castCategory'], $rows);
    }

    /**
     * Update categories for a metric type (replaces all existing associations)
     */
    public function updateMetricTypeCategories(int $metricTypeId, array $categoryIds): bool
    {
        try {
            $this->conn->beginTransaction();

            // Remove existing associations
            $sql = "DELETE FROM metric_type_categories WHERE metric_type_id = ?";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$metricTypeId]);

            // Add new associations
            if (!empty($categoryIds)) {
                $sql = "INSERT INTO metric_type_categories (metric_type_id, category_id) VALUES (?, ?)";
                $stmt = $this->conn->prepare($sql);

                foreach ($categoryIds as $categoryId) {
                    $stmt->execute([$metricTypeId, $categoryId]);
                }
            }

            $this->conn->commit();
            return true;
        } catch (Exception $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }
}
