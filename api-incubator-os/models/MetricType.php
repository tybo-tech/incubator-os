<?php
declare(strict_types=1);

class MetricType
{
    private PDO $conn;
    public array $categories = [];

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /* ============================ Create / Update ============================ */

    public function add(array $data): array
    {
        $sql = "INSERT INTO metric_types (group_id, code, name, description, unit, show_total, show_margin, graph_color, period_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            $data['group_id'] ?? 1,
            $data['code'],
            $data['name'],
            $data['description'] ?? '',
            $data['unit'] ?? 'ZAR',
            $data['show_total'] ?? 1,
            $data['show_margin'] ?? 0,
            $data['graph_color'] ?? null,
            $data['period_type'] ?? 'QUARTERLY'
        ]);

        $metricTypeId = (int)$this->conn->lastInsertId();

        // Handle categories if provided
        if (isset($data['categories']) && is_array($data['categories'])) {
            $this->saveCategories($metricTypeId, $data['categories']);
        }

        return $this->getById($metricTypeId);
    }

    public function update(int $id, array $fields): ?array
    {
        $allowed = ['group_id', 'code', 'name', 'description', 'unit', 'show_total', 'show_margin', 'graph_color', 'period_type'];
        $sets = [];
        $params = [];

        foreach ($allowed as $k) {
            if (array_key_exists($k, $fields)) {
                $sets[] = "$k = ?";
                $params[] = $fields[$k];
            }
        }

        if ($sets) {
            $params[] = $id;
            $sql = "UPDATE metric_types SET " . implode(', ', $sets) . ", updated_at = NOW() WHERE id = ?";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);
        }

        // Handle categories if provided
        if (array_key_exists('categories', $fields) && is_array($fields['categories'])) {
            $this->saveCategories($id, $fields['categories']);
        }

        return $this->getById($id);
    }

    /* ================================ Read ================================= */

    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM metric_types WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    public function getByCode(string $code): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM metric_types WHERE code = ?");
        $stmt->execute([$code]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    public function listAll(): array
    {
        $stmt = $this->conn->query("SELECT * FROM metric_types ORDER BY name ASC");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(fn($r) => $this->castRow($r), $rows);
    }

    /* ================================ Delete ================================ */

    public function delete(int $id): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM metric_types WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    /* ============================= Utilities ================================ */

    private function castRow(array $row): array
    {
        // Cast integers
        foreach (['id', 'group_id', 'show_total', 'show_margin'] as $k) {
            if (array_key_exists($k, $row)) {
                $row[$k] = (int)$row[$k];
            }
        }

        // Load categories for this metric type
        if (isset($row['id'])) {
            $row['categories'] = $this->loadCategories((int)$row['id']);
        }

        return $row;
    }

    /* ============================= Category Management ============================= */

    /**
     * Load categories for a specific metric type
     */
    private function loadCategories(int $metricTypeId): array
    {
        $stmt = $this->conn->prepare("
            SELECT c.id, c.name, c.description
            FROM categories c
            JOIN metric_type_categories mc ON mc.category_id = c.id
            WHERE mc.metric_type_id = ?
            ORDER BY c.name ASC
        ");
        $stmt->execute([$metricTypeId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Save categories for a metric type (replace existing)
     */
    private function saveCategories(int $metricTypeId, array $categoryIds): void
    {
        // Delete old links
        $stmt = $this->conn->prepare("DELETE FROM metric_type_categories WHERE metric_type_id = ?");
        $stmt->execute([$metricTypeId]);

        // Insert new category IDs
        if (!empty($categoryIds)) {
            $stmt = $this->conn->prepare("INSERT INTO metric_type_categories (metric_type_id, category_id) VALUES (?, ?)");
            foreach ($categoryIds as $categoryId) {
                if (is_numeric($categoryId)) {
                    $stmt->execute([$metricTypeId, (int)$categoryId]);
                }
            }
        }
    }

    /**
     * Get categories for a specific metric type (public interface)
     */
    public function getCategories(int $id): array
    {
        return $this->loadCategories($id);
    }

    /**
     * Update categories for a metric type (public interface)
     */
    public function updateCategories(int $id, array $categoryIds): ?array
    {
        $metricType = $this->getById($id);
        if (!$metricType) return null;

        $this->saveCategories($id, $categoryIds);
        return $this->getById($id);
    }

    /**
     * Get metric types that have categories (for dropdowns)
     */
    public function getTypesWithCategories(): array
    {
        $stmt = $this->conn->query("
            SELECT DISTINCT mt.*
            FROM metric_types mt
            JOIN metric_type_categories mc ON mt.id = mc.metric_type_id
            ORDER BY mt.name ASC
        ");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(fn($r) => $this->castRow($r), $rows);
    }
}
