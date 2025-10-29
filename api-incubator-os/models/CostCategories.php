<?php
declare(strict_types=1);

final class CostCategories
{
    private PDO $conn;
    
    // Define writable fields for security
    private const WRITABLE = [
        'name', 'parent_id', 'industry_id', 'cost_type', 'status_id'
    ];

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /* =========================================================================
       CREATE / UPDATE
       ========================================================================= */

    /**
     * Create a cost category
     */
    public function addCostCategory(
        string $name,
        ?int $parentId = null,
        ?int $industryId = null,
        ?string $costType = null,
        ?int $statusId = 1
    ): array {
        $this->validateCostCategory($name, $parentId, $industryId);

        $sql = "INSERT INTO cost_categories (name, parent_id, industry_id, cost_type, status_id) VALUES (?, ?, ?, ?, ?)";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$name, $parentId, $industryId, $costType, $statusId]);

        return $this->getCostCategoryById((int)$this->conn->lastInsertId());
    }

    /**
     * Update a cost category (safe allow-list)
     */
    public function updateCostCategory(int $id, array $fields): ?array
    {
        $current = $this->getCostCategoryById($id);
        if (!$current) return null;

        $filtered = $this->filterWritable($fields);
        if (empty($filtered)) return $current;

        // Validate before update
        $name = $filtered['name'] ?? $current['name'];
        $parentId = array_key_exists('parent_id', $filtered) ? $filtered['parent_id'] : $current['parent_id'];
        $industryId = array_key_exists('industry_id', $filtered) ? $filtered['industry_id'] : $current['industry_id'];
        
        $this->validateCostCategory($name, $parentId, $industryId, $id);

        $sets = [];
        $params = [];
        foreach ($filtered as $key => $value) {
            $sets[] = "$key = ?";
            $params[] = $value;
        }
        
        $params[] = $id;
        $sql = "UPDATE cost_categories SET " . implode(', ', $sets) . " WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return $this->getCostCategoryById($id);
    }

    /* =========================================================================
       READ
       ========================================================================= */

    /**
     * Get cost category by ID
     */
    public function getCostCategoryById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM cost_categories WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castCostCategory($row) : null;
    }

    /**
     * List cost categories with optional filters
     */
    public function listCostCategories(array $filters = []): array
    {
        $where = [];
        $params = [];

        if (!empty($filters['parent_id'])) {
            if ($filters['parent_id'] === 'null') {
                $where[] = 'parent_id IS NULL';
            } else {
                $where[] = 'parent_id = ?';
                $params[] = (int)$filters['parent_id'];
            }
        }

        if (!empty($filters['industry_id'])) {
            if ($filters['industry_id'] === 'null') {
                $where[] = 'industry_id IS NULL';
            } else {
                $where[] = 'industry_id = ?';
                $params[] = (int)$filters['industry_id'];
            }
        }

        if (!empty($filters['search'])) {
            $where[] = 'name LIKE ?';
            $params[] = '%' . $filters['search'] . '%';
        }

        if (!empty($filters['cost_type'])) {
            $where[] = 'cost_type = ?';
            $params[] = $filters['cost_type'];
        }

        if (isset($filters['status_id'])) {
            $where[] = 'status_id = ?';
            $params[] = (int)$filters['status_id'];
        }

        $sql = "SELECT * FROM cost_categories";
        if ($where) {
            $sql .= " WHERE " . implode(' AND ', $where);
        }
        $sql .= " ORDER BY name ASC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        $categories = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $categories[] = $this->castCostCategory($row);
        }

        return $categories;
    }

    /**
     * Get cost category tree structure
     */
    public function getCostCategoryTree(?int $industryId = null): array
    {
        $filters = [];
        if ($industryId !== null) {
            $filters['industry_id'] = $industryId;
        }

        $allCategories = $this->listCostCategories($filters);
        
        // Build tree structure
        $categoryMap = [];
        $rootCategories = [];

        // First pass: create map and identify roots
        foreach ($allCategories as $category) {
            $categoryMap[$category['id']] = $category;
            $categoryMap[$category['id']]['children'] = [];
            
            if ($category['parent_id'] === null) {
                $rootCategories[] = &$categoryMap[$category['id']];
            }
        }

        // Second pass: build parent-child relationships
        foreach ($allCategories as $category) {
            if ($category['parent_id'] !== null && isset($categoryMap[$category['parent_id']])) {
                $categoryMap[$category['parent_id']]['children'][] = &$categoryMap[$category['id']];
            }
        }

        return $rootCategories;
    }

    /**
     * Get children of a specific cost category
     */
    public function getCostCategoryChildren(int $parentId): array
    {
        return $this->listCostCategories(['parent_id' => $parentId]);
    }

    /**
     * Get cost categories by industry
     */
    public function getCostCategoriesByIndustry(int $industryId): array
    {
        return $this->listCostCategories(['industry_id' => $industryId]);
    }

    /**
     * Get root cost categories (no parent)
     */
    public function getRootCostCategories(?int $industryId = null): array
    {
        $filters = ['parent_id' => 'null'];
        if ($industryId !== null) {
            $filters['industry_id'] = $industryId;
        }
        return $this->listCostCategories($filters);
    }

    /**
     * Search cost categories by name
     */
    public function searchCostCategories(string $search, ?int $industryId = null): array
    {
        $filters = ['search' => $search];
        if ($industryId !== null) {
            $filters['industry_id'] = $industryId;
        }
        return $this->listCostCategories($filters);
    }

    /**
     * Get cost categories by type (direct or operational)
     */
    public function getCostCategoriesByType(string $costType): array
    {
        return $this->listCostCategories(['cost_type' => $costType, 'status_id' => 1]);
    }

    /**
     * Get direct cost categories only
     */
    public function getDirectCostCategories(): array
    {
        return $this->getCostCategoriesByType('direct');
    }

    /**
     * Get operational cost categories only
     */
    public function getOperationalCostCategories(): array
    {
        return $this->getCostCategoriesByType('operational');
    }

    /* =========================================================================
       DELETE
       ========================================================================= */

    /**
     * Delete a cost category (with cascade handling)
     */
    public function deleteCostCategory(int $id): bool
    {
        // Check if category has children
        $children = $this->getCostCategoryChildren($id);
        if (!empty($children)) {
            throw new InvalidArgumentException("Cannot delete category with children. Please delete children first.");
        }

        $stmt = $this->conn->prepare("DELETE FROM cost_categories WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    /* =========================================================================
       BUSINESS LOGIC
       ========================================================================= */

    /**
     * Get cost category breadcrumb path
     */
    public function getCostCategoryBreadcrumb(int $categoryId): array
    {
        $breadcrumb = [];
        $current = $this->getCostCategoryById($categoryId);
        
        while ($current) {
            array_unshift($breadcrumb, $current);
            $current = $current['parent_id'] ? $this->getCostCategoryById($current['parent_id']) : null;
        }
        
        return $breadcrumb;
    }

    /**
     * Check if category can be moved to new parent (prevent circular references)
     */
    public function canMoveCategory(int $categoryId, ?int $newParentId): bool
    {
        if ($newParentId === null) return true;
        if ($categoryId === $newParentId) return false;

        // Check if newParentId is a descendant of categoryId
        $descendants = $this->getAllDescendants($categoryId);
        return !in_array($newParentId, array_column($descendants, 'id'));
    }

    /**
     * Move category to new parent
     */
    public function moveCostCategory(int $categoryId, ?int $newParentId): ?array
    {
        if (!$this->canMoveCategory($categoryId, $newParentId)) {
            throw new InvalidArgumentException("Cannot move category: would create circular reference");
        }

        return $this->updateCostCategory($categoryId, ['parent_id' => $newParentId]);
    }

    /**
     * Get all descendants of a category
     */
    public function getAllDescendants(int $categoryId): array
    {
        $descendants = [];
        $children = $this->getCostCategoryChildren($categoryId);
        
        foreach ($children as $child) {
            $descendants[] = $child;
            $descendants = array_merge($descendants, $this->getAllDescendants($child['id']));
        }
        
        return $descendants;
    }

    /**
     * Get category statistics
     */
    public function getCostCategoryStatistics(int $categoryId): array
    {
        $category = $this->getCostCategoryById($categoryId);
        if (!$category) {
            throw new InvalidArgumentException("Cost category not found");
        }

        $directChildren = count($this->getCostCategoryChildren($categoryId));
        $allDescendants = count($this->getAllDescendants($categoryId));
        
        return [
            'id' => $categoryId,
            'name' => $category['name'],
            'direct_children' => $directChildren,
            'total_descendants' => $allDescendants,
            'has_parent' => $category['parent_id'] !== null,
            'industry_id' => $category['industry_id']
        ];
    }

    /* =========================================================================
       PRIVATE HELPERS
       ========================================================================= */

    /**
     * Filter input to only writable fields
     */
    private function filterWritable(array $data): array
    {
        return array_intersect_key($data, array_flip(self::WRITABLE));
    }

    /**
     * Cast database row to proper types
     */
    private function castCostCategory(array $row): array
    {
        return [
            'id' => (int)$row['id'],
            'name' => (string)$row['name'],
            'parent_id' => $row['parent_id'] ? (int)$row['parent_id'] : null,
            'industry_id' => $row['industry_id'] ? (int)$row['industry_id'] : null,
            'cost_type' => $row['cost_type'] ?? null,
            'status_id' => $row['status_id'] ? (int)$row['status_id'] : 1
        ];
    }

    /**
     * Validate cost category data
     */
    private function validateCostCategory(string $name, ?int $parentId, ?int $industryId, ?int $excludeId = null): void
    {
        if (empty(trim($name))) {
            throw new InvalidArgumentException("Cost category name cannot be empty");
        }

        if (strlen($name) > 255) {
            throw new InvalidArgumentException("Cost category name cannot exceed 255 characters");
        }

        // Check for duplicate names under same parent
        $existing = $this->findCostCategoryByNameAndParent($name, $parentId);
        if ($existing && (!$excludeId || $existing['id'] !== $excludeId)) {
            $parentName = $parentId ? $this->getCostCategoryById($parentId)['name'] : 'root';
            throw new InvalidArgumentException("Cost category '$name' already exists under parent '$parentName'");
        }

        // Validate parent exists if provided
        if ($parentId !== null && !$this->getCostCategoryById($parentId)) {
            throw new InvalidArgumentException("Parent cost category does not exist");
        }
    }

    /**
     * Find cost category by name and parent
     */
    private function findCostCategoryByNameAndParent(string $name, ?int $parentId): ?array
    {
        if ($parentId === null) {
            $sql = "SELECT * FROM cost_categories WHERE name = ? AND parent_id IS NULL LIMIT 1";
            $params = [$name];
        } else {
            $sql = "SELECT * FROM cost_categories WHERE name = ? AND parent_id = ? LIMIT 1";
            $params = [$name, $parentId];
        }

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castCostCategory($row) : null;
    }
}