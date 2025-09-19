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
        $stmt = $this->conn->prepare("SELECT * FROM metric_groups WHERE client_id = ? ORDER BY name ASC");
        $stmt->execute([$clientId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function deleteGroup(int $id): bool
    {
        return $this->deleteRow('metric_groups', $id);
    }

    /* ========================= TYPES ========================= */

    public function addType(int $groupId, string $code, string $name, string $description = '', string $unit = 'count', int $showTotal = 1, int $showMargin = 0, ?string $graphColor = null): array
    {
        $sql = "INSERT INTO metric_types (group_id, code, name, description, unit, show_total, show_margin, graph_color)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$groupId, $code, $name, $description, $unit, $showTotal, $showMargin, $graphColor]);

        return $this->getTypeById((int)$this->conn->lastInsertId());
    }

    public function updateType(int $id, array $fields): ?array
    {
        $allowed = ['group_id','code','name','description','unit','show_total','show_margin','graph_color'];
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
            // 2. Fetch types for each group
            $stmt = $this->conn->prepare("SELECT * FROM metric_types WHERE group_id = ? ORDER BY name ASC");
            $stmt->execute([$group['id']]);
            $types = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($types as &$type) {
                // 3. Fetch records for each type
                $stmt2 = $this->conn->prepare("SELECT * FROM metric_records
                                               WHERE metric_type_id = ? AND company_id = ?
                                               AND program_id = ? AND cohort_id = ?
                                               ORDER BY year_ DESC");
                $stmt2->execute([$type['id'], $companyId, $programId, $cohortId]);
                $type['records'] = $stmt2->fetchAll(PDO::FETCH_ASSOC);
            }

            $group['types'] = $types;
        }

        return $groups;
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
