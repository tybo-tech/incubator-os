<?php
declare(strict_types=1);

class MetricRecord
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
        $sql = "INSERT INTO metric_records (company_id, metric_type_id, year, quarter, value, note, title, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            $data['company_id'],
            $data['metric_type_id'],
            $data['year'],
            $data['quarter'] ?? null,
            $data['value'],
            $data['note'] ?? null,
            $data['title'] ?? null  // New title field for categories
        ]);

        return $this->getById((int)$this->conn->lastInsertId());
    }

    public function update(int $id, array $fields): ?array
    {
        $allowed = ['metric_type_id', 'year', 'quarter', 'value', 'note', 'title'];
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
        $sql = "UPDATE metric_records SET " . implode(', ', $sets) . ", updated_at = NOW() WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return $this->getById($id);
    }

    /* ================================ Read ================================= */

    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("
            SELECT mr.*, mt.name as metric_type_name, mt.unit
            FROM metric_records mr
            LEFT JOIN metric_types mt ON mr.metric_type_id = mt.id
            WHERE mr.id = ?
        ");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castRow($row) : null;
    }

    public function getByCompany(int $companyId, ?int $year = null, ?string $periodType = null): array
    {
        $conditions = ["mr.company_id = ?"];
        $params = [$companyId];

        if ($year) {
            $conditions[] = "mr.year = ?";
            $params[] = $year;
        }

        if ($periodType) {
            $conditions[] = "mt.period_type = ?";
            $params[] = $periodType;
        }

        $sql = "
            SELECT mr.*, mt.name as metric_type_name, mt.unit, mt.period_type
            FROM metric_records mr
            LEFT JOIN metric_types mt ON mr.metric_type_id = mt.id
            WHERE " . implode(' AND ', $conditions) . "
            ORDER BY mr.year DESC, mr.quarter DESC, mt.name ASC
        ";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(fn($r) => $this->castRow($r), $rows);
    }

    public function getByMetricType(int $metricTypeId, ?int $companyId = null): array
    {
        $conditions = ["mr.metric_type_id = ?"];
        $params = [$metricTypeId];

        if ($companyId) {
            $conditions[] = "mr.company_id = ?";
            $params[] = $companyId;
        }

        $sql = "
            SELECT mr.*, mt.name as metric_type_name, mt.unit
            FROM metric_records mr
            LEFT JOIN metric_types mt ON mr.metric_type_id = mt.id
            WHERE " . implode(' AND ', $conditions) . "
            ORDER BY mr.year DESC, mr.quarter DESC
        ";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(fn($r) => $this->castRow($r), $rows);
    }

    /**
     * Get records grouped by categories (for metric types with categories)
     */
    public function getRecordsByCategory(int $companyId, int $metricTypeId, int $year): array
    {
        $sql = "
            SELECT mr.*, mt.name as metric_type_name, mt.unit
            FROM metric_records mr
            LEFT JOIN metric_types mt ON mr.metric_type_id = mt.id
            WHERE mr.company_id = ? AND mr.metric_type_id = ? AND mr.year = ?
            ORDER BY mr.title ASC, mr.quarter ASC
        ";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$companyId, $metricTypeId, $year]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $records = array_map(fn($r) => $this->castRow($r), $rows);

        // Group by title (category)
        $grouped = [];
        foreach ($records as $record) {
            $title = $record['title'] ?? 'uncategorized';
            if (!isset($grouped[$title])) {
                $grouped[$title] = [];
            }
            $grouped[$title][] = $record;
        }

        return $grouped;
    }

    /* ================================ Delete ================================ */

    public function delete(int $id): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM metric_records WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    public function deleteByCompanyAndType(int $companyId, int $metricTypeId): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM metric_records WHERE company_id = ? AND metric_type_id = ?");
        $stmt->execute([$companyId, $metricTypeId]);
        return $stmt->rowCount() > 0;
    }

    /* ============================= Utilities ================================ */

    private function castRow(array $row): array
    {
        // Cast integers
        foreach (['id', 'company_id', 'metric_type_id', 'year', 'quarter'] as $k) {
            if (array_key_exists($k, $row) && $row[$k] !== null) {
                $row[$k] = (int)$row[$k];
            }
        }

        // Cast decimal values
        if (isset($row['value']) && $row['value'] !== null) {
            $row['value'] = (float)$row['value'];
        }



        return $row;
    }

    /* ============================= Category Helpers ============================= */

    /**
     * Get available category options for a metric type
     */
    public function getCategoryOptions(int $metricTypeId): array
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
     * Bulk insert records with categories (useful for balance sheet data)
     */
    public function bulkInsertWithCategories(int $companyId, int $metricTypeId, int $year, array $categoryRecords): array
    {
        $insertedIds = [];

        foreach ($categoryRecords as $categoryData) {
            $data = [
                'company_id' => $companyId,
                'metric_type_id' => $metricTypeId,
                'year' => $year,
                'quarter' => $categoryData['quarter'] ?? null,
                'value' => $categoryData['value'],
                'note' => $categoryData['note'] ?? null,
                'title' => $categoryData['title'] ?? null
            ];

            $record = $this->add($data);
            $insertedIds[] = $record['id'];
        }

        return $insertedIds;
    }
}
