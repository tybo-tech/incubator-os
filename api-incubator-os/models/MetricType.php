<?php
declare(strict_types=1);

class MetricType
{
    private PDO $conn;

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /* ============================ Create / Update ============================ */

    public function add(array $data): array
    {
        $sql = "INSERT INTO metric_types (group_id, code, name, description, unit, show_total, show_margin, graph_color, period_type, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        $metadata = isset($data['metadata']) ? json_encode($data['metadata']) : null;

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
            $data['period_type'] ?? 'QUARTERLY',
            $metadata
        ]);

        return $this->getById((int)$this->conn->lastInsertId());
    }

    public function update(int $id, array $fields): ?array
    {
        $allowed = ['group_id', 'code', 'name', 'description', 'unit', 'show_total', 'show_margin', 'graph_color', 'period_type', 'metadata'];
        $sets = [];
        $params = [];

        foreach ($allowed as $k) {
            if (array_key_exists($k, $fields)) {
                if ($k === 'metadata') {
                    // Convert metadata to JSON string
                    $sets[] = "$k = ?";
                    $params[] = is_array($fields[$k]) ? json_encode($fields[$k]) : $fields[$k];
                } else {
                    $sets[] = "$k = ?";
                    $params[] = $fields[$k];
                }
            }
        }
        if (!$sets) return $this->getById($id);

        $params[] = $id;
        $sql = "UPDATE metric_types SET " . implode(', ', $sets) . ", updated_at = NOW() WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

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

        // Parse metadata JSON
        if (isset($row['metadata']) && $row['metadata']) {
            $decoded = json_decode($row['metadata'], true);
            $row['metadata'] = $decoded !== null ? $decoded : null;
        } else {
            $row['metadata'] = null;
        }

        return $row;
    }

    /* ============================= Metadata Helpers ============================= */

    /**
     * Get categories from metadata for a specific metric type
     */
    public function getCategories(int $id): array
    {
        $metricType = $this->getById($id);
        if (!$metricType || !$metricType['metadata'] || !isset($metricType['metadata']['categories'])) {
            return [];
        }

        return $metricType['metadata']['categories'];
    }

    /**
     * Add or update categories in metadata
     */
    public function updateCategories(int $id, array $categories): ?array
    {
        $metricType = $this->getById($id);
        if (!$metricType) return null;

        $metadata = $metricType['metadata'] ?? [];
        $metadata['categories'] = $categories;

        return $this->update($id, ['metadata' => $metadata]);
    }

    /**
     * Get metric types that have categories (for dropdowns)
     */
    public function getTypesWithCategories(): array
    {
        $stmt = $this->conn->query("
            SELECT * FROM metric_types
            WHERE metadata IS NOT NULL
            AND JSON_EXTRACT(metadata, '$.categories') IS NOT NULL
            ORDER BY name ASC
        ");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(fn($r) => $this->castRow($r), $rows);
    }
}
