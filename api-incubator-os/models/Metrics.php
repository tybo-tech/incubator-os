<?php
declare(strict_types=1);

class Metrics
{
    private PDO $conn;

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /* ========================= GROUPS ========================= */

    public function addGroup(int $clientId, string $code, string $name, string $description = '', int $showTotal = 1, int $showMargin = 0, ?string $graphColor = null): array
    {
        $sql = "INSERT INTO metric_groups (client_id, code, name, description, show_total, show_margin, graph_color)
                VALUES (?, ?, ?, ?, ?, ?, ?)";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$clientId, $code, $name, $description, $showTotal, $showMargin, $graphColor]);

        return $this->getGroupById((int)$this->conn->lastInsertId());
    }

    public function updateGroup(int $id, array $fields): ?array
    {
        $allowed = ['code','name','description','show_total','show_margin','graph_color'];
        return $this->updateRow('metric_groups', $id, $fields, $allowed);
    }

    public function getGroupById(int $id): ?array
    {
        return $this->getRowById('metric_groups', $id);
    }

    public function listGroups(int $clientId): array
    {
        $stmt = $this->conn->prepare("SELECT * FROM metric_groups WHERE client_id = ? ORDER BY order_no ASC");
        $stmt->execute([$clientId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function deleteGroup(int $id): bool
    {
        return $this->deleteRow('metric_groups', $id);
    }

    /* ========================= TYPES ========================= */

    public function addType(int $groupId, string $code, string $name, string $description = '', string $unit = 'count', int $showTotal = 1, int $showMargin = 0, ?string $graphColor = null, string $periodType = 'QUARTERLY'): array
    {
        $sql = "INSERT INTO metric_types (group_id, code, name, description, unit, show_total, show_margin, graph_color, period_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$groupId, $code, $name, $description, $unit, $showTotal, $showMargin, $graphColor, $periodType]);

        return $this->getTypeById((int)$this->conn->lastInsertId());
    }

    public function updateType(int $id, array $fields): ?array
    {
        $allowed = ['group_id','code','name','description','unit','show_total','show_margin','graph_color','period_type'];
        return $this->updateRow('metric_types', $id, $fields, $allowed);
    }

    public function getTypeById(int $id): ?array
    {
        return $this->getRowById('metric_types', $id);
    }

    public function listTypesByGroup(int $groupId): array
    {
        $stmt = $this->conn->prepare("SELECT * FROM metric_types WHERE group_id = ? ORDER BY name ASC");
        $stmt->execute([$groupId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function deleteType(int $id): bool
    {
        return $this->deleteRow('metric_types', $id);
    }

    /* ========================= RECORDS ========================= */

    public function addRecord(int $clientId, int $companyId, int $programId, int $cohortId, int $metricTypeId, int $year, ?float $q1, ?float $q2, ?float $q3, ?float $q4, ?float $total, ?float $marginPct, string $unit = 'ZAR'): array
    {
        $sql = "INSERT INTO metric_records
                (client_id, company_id, program_id, cohort_id, metric_type_id, year_, q1, q2, q3, q4, total, margin_pct, unit)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$clientId, $companyId, $programId, $cohortId, $metricTypeId, $year, $q1, $q2, $q3, $q4, $total, $marginPct, $unit]);

        return $this->getRecordById((int)$this->conn->lastInsertId());
    }

    public function updateRecord(int $id, array $fields): ?array
    {
        $allowed = ['client_id','company_id','program_id','cohort_id','metric_type_id','year_','q1','q2','q3','q4','total','margin_pct','unit'];
        return $this->updateRow('metric_records', $id, $fields, $allowed);
    }

    public function getRecordById(int $id): ?array
    {
        return $this->getRowById('metric_records', $id);
    }

    public function listRecords(int $metricTypeId, int $companyId, int $programId, int $cohortId): array
    {
        $sql = "SELECT * FROM metric_records
                WHERE metric_type_id = ? AND company_id = ? AND program_id = ? AND cohort_id = ?
                ORDER BY year_ DESC";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$metricTypeId, $companyId, $programId, $cohortId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function deleteRecord(int $id): bool
    {
        return $this->deleteRow('metric_records', $id);
    }

    /* ========================= HIERARCHY FOR UI ========================= */

    public function getFullMetrics(int $clientId, int $companyId, int $programId, int $cohortId): array
    {
        // 1. Fetch groups
        $groups = $this->listGroups($clientId);

        foreach ($groups as &$group) {
            // 2. Fetch types for each group (now including metadata and period_type)
            $stmt = $this->conn->prepare("SELECT *, metadata, period_type FROM metric_types WHERE group_id = ? ORDER BY name ASC");
            $stmt->execute([$group['id']]);
            $types = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($types as &$type) {
                // Parse metadata JSON if present
                if (isset($type['metadata']) && $type['metadata']) {
                    $decoded = json_decode($type['metadata'], true);
                    $type['metadata'] = $decoded !== null ? $decoded : null;
                } else {
                    $type['metadata'] = null;
                }

                // 3. Fetch records for each type (now including title field)
                $stmt2 = $this->conn->prepare("SELECT *, title FROM metric_records
                                               WHERE metric_type_id = ? AND company_id = ?
                                               AND program_id = ? AND cohort_id = ?
                                               ORDER BY year_ DESC, title ASC");
                $stmt2->execute([$type['id'], $companyId, $programId, $cohortId]);
                $records = $stmt2->fetchAll(PDO::FETCH_ASSOC);

                // Group records by categories if metadata has categories
                if ($type['metadata'] && isset($type['metadata']['categories'])) {
                    $groupedRecords = [];
                    foreach ($records as $record) {
                        $title = $record['title'] ?? 'uncategorized';
                        if (!isset($groupedRecords[$title])) {
                            $groupedRecords[$title] = [];
                        }
                        $groupedRecords[$title][] = $record;
                    }
                    $type['records'] = $records; // Keep original format for backward compatibility
                    $type['records_by_category'] = $groupedRecords; // New grouped format
                } else {
                    $type['records'] = $records;
                }
            }

            $group['types'] = $types;
        }

        return $groups;
    }

    /* ========================= METADATA & CATEGORIES ========================= */

    /**
     * Get categories for a specific metric type
     */
    public function getTypeCategories(int $typeId): array
    {
        $stmt = $this->conn->prepare("SELECT metadata FROM metric_types WHERE id = ?");
        $stmt->execute([$typeId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row && $row['metadata']) {
            $metadata = json_decode($row['metadata'], true);
            return $metadata['categories'] ?? [];
        }

        return [];
    }

    /**
     * Update categories for a metric type
     */
    public function updateTypeCategories(int $typeId, array $categories): ?array
    {
        $stmt = $this->conn->prepare("SELECT metadata FROM metric_types WHERE id = ?");
        $stmt->execute([$typeId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        $metadata = [];
        if ($row && $row['metadata']) {
            $metadata = json_decode($row['metadata'], true) ?? [];
        }

        $metadata['categories'] = $categories;
        $metadataJson = json_encode($metadata);

        $stmt = $this->conn->prepare("UPDATE metric_types SET metadata = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$metadataJson, $typeId]);

        return $this->getTypeById($typeId);
    }

    /**
     * Get metric types that have categories
     */
    public function getTypesWithCategories(int $clientId): array
    {
        $stmt = $this->conn->prepare("
            SELECT mt.*, mg.name as group_name
            FROM metric_types mt
            LEFT JOIN metric_groups mg ON mt.group_id = mg.id
            WHERE mg.client_id = ?
            AND mt.metadata IS NOT NULL
            AND JSON_EXTRACT(mt.metadata, '$.categories') IS NOT NULL
            ORDER BY mg.name ASC, mt.name ASC
        ");
        $stmt->execute([$clientId]);
        $types = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Parse metadata for each type
        foreach ($types as &$type) {
            if ($type['metadata']) {
                $type['metadata'] = json_decode($type['metadata'], true);
            }
        }

        return $types;
    }

    /* ========================= INTERNAL HELPERS ========================= */

    private function getRowById(string $table, int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM {$table} WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    private function updateRow(string $table, int $id, array $fields, array $allowed): ?array
    {
        $sets = [];
        $params = [];

        foreach ($allowed as $k) {
            if (array_key_exists($k, $fields)) {
                $sets[] = "$k = ?";
                $params[] = $fields[$k];
            }
        }
        if (!$sets) return $this->getRowById($table, $id);

        $params[] = $id;
        $sql = "UPDATE {$table} SET " . implode(', ', $sets) . ", updated_at = NOW() WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return $this->getRowById($table, $id);
    }

    private function deleteRow(string $table, int $id): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM {$table} WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }
}
