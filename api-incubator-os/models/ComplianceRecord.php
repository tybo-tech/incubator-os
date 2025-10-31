<?php
declare(strict_types=1);

final class ComplianceRecord
{
    private PDO $conn;

    // Writable fields to prevent unwanted mass assignment
    private const WRITABLE = [
        'tenant_id', 'client_id', 'program_id', 'cohort_id', 'company_id',
        'financial_year_id', 'type', 'period', 'title', 'sub_type',
        'date_1', 'date_2', 'date_3', 'count_1', 'count_2',
        'amount_1', 'amount_2', 'amount_3', 'level', 'progress',
        'responsible_person', 'status', 'notes', 'metadata',
        'created_by', 'updated_by'
    ];

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /* ===============================================================
       CREATE / UPDATE
       =============================================================== */

    /**
     * Add a new compliance record.
     */
    public function add(array $data): array
    {
        $filtered = $this->filterWritable($data);

        $sql = "INSERT INTO compliance_records (
                    tenant_id, client_id, program_id, cohort_id, company_id, financial_year_id,
                    type, period, title, sub_type,
                    date_1, date_2, date_3,
                    count_1, count_2,
                    amount_1, amount_2, amount_3,
                    level, progress, responsible_person, status, notes, metadata,
                    created_by, updated_by, created_at, updated_at
                ) VALUES (
                    :tenant_id, :client_id, :program_id, :cohort_id, :company_id, :financial_year_id,
                    :type, :period, :title, :sub_type,
                    :date_1, :date_2, :date_3,
                    :count_1, :count_2,
                    :amount_1, :amount_2, :amount_3,
                    :level, :progress, :responsible_person, :status, :notes, :metadata,
                    :created_by, :updated_by, NOW(), NOW()
                )";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            ':tenant_id' => $filtered['tenant_id'] ?? null,
            ':client_id' => $filtered['client_id'],
            ':program_id' => $filtered['program_id'] ?? null,
            ':cohort_id' => $filtered['cohort_id'] ?? null,
            ':company_id' => $filtered['company_id'],
            ':financial_year_id' => $filtered['financial_year_id'],
            ':type' => $filtered['type'],
            ':period' => $filtered['period'] ?? null,
            ':title' => $filtered['title'] ?? null,
            ':sub_type' => $filtered['sub_type'] ?? null,
            ':date_1' => $filtered['date_1'] ?? null,
            ':date_2' => $filtered['date_2'] ?? null,
            ':date_3' => $filtered['date_3'] ?? null,
            ':count_1' => $filtered['count_1'] ?? null,
            ':count_2' => $filtered['count_2'] ?? null,
            ':amount_1' => $filtered['amount_1'] ?? null,
            ':amount_2' => $filtered['amount_2'] ?? null,
            ':amount_3' => $filtered['amount_3'] ?? null,
            ':level' => $filtered['level'] ?? null,
            ':progress' => $filtered['progress'] ?? null,
            ':responsible_person' => $filtered['responsible_person'] ?? null,
            ':status' => $filtered['status'] ?? 'Pending',
            ':notes' => $filtered['notes'] ?? null,
            ':metadata' => $filtered['metadata'] ?? null,
            ':created_by' => $filtered['created_by'] ?? null,
            ':updated_by' => $filtered['updated_by'] ?? null
        ]);

        $id = (int) $this->conn->lastInsertId();
        return $this->getById($id);
    }

    /**
     * Update an existing record.
     */
    public function update(int $id, array $data): array
    {
        $filtered = $this->filterWritable($data);

        $setParts = [];
        foreach ($filtered as $key => $value) {
            $setParts[] = "`$key` = :$key";
        }
        $setParts[] = "`updated_at` = NOW()";
        $sql = "UPDATE compliance_records SET " . implode(', ', $setParts) . " WHERE id = :id";

        $stmt = $this->conn->prepare($sql);
        $filtered['id'] = $id;
        $stmt->execute($filtered);

        if ($stmt->rowCount() === 0) {
            throw new Exception("Compliance record $id not found or no changes made");
        }

        return $this->getById($id);
    }

    /* ===============================================================
       READ
       =============================================================== */

    public function getById(int $id): array
    {
        $stmt = $this->conn->prepare("SELECT * FROM compliance_records WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new Exception("Record $id not found");
        }
        return $this->castTypes($row);
    }

    public function listAll(array $filters = []): array
    {
        $sql = "SELECT * FROM compliance_records WHERE 1=1";
        $params = [];

        foreach (['tenant_id','client_id','program_id','cohort_id','company_id','financial_year_id','type','status'] as $f) {
            if (isset($filters[$f])) {
                $sql .= " AND $f = :$f";
                $params[":$f"] = $filters[$f];
            }
        }

        if (isset($filters['search'])) {
            $sql .= " AND (title LIKE :search OR notes LIKE :search)";
            $params[':search'] = '%' . $filters['search'] . '%';
        }

        $sql .= " ORDER BY updated_at DESC, id DESC";
        if (isset($filters['limit'])) {
            $sql .= " LIMIT " . (int)$filters['limit'];
            if (isset($filters['offset'])) {
                $sql .= " OFFSET " . (int)$filters['offset'];
            }
        }

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map([$this, 'castTypes'], $rows);
    }

    /* ===============================================================
       DELETE
       =============================================================== */

    public function delete(int $id): bool
    {
        $this->getById($id); // ensure exists
        $stmt = $this->conn->prepare("DELETE FROM compliance_records WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    /* ===============================================================
       UTILITIES
       =============================================================== */

    private function filterWritable(array $data): array
    {
        return array_intersect_key($data, array_flip(self::WRITABLE));
    }

    private function castTypes(array $r): array
    {
        return [
            'id' => (int)$r['id'],
            'tenant_id' => $r['tenant_id'] ? (int)$r['tenant_id'] : null,
            'client_id' => (int)$r['client_id'],
            'program_id' => $r['program_id'] ? (int)$r['program_id'] : null,
            'cohort_id' => $r['cohort_id'] ? (int)$r['cohort_id'] : null,
            'company_id' => (int)$r['company_id'],
            'financial_year_id' => (int)$r['financial_year_id'],
            'type' => (string)$r['type'],
            'period' => $r['period'] ?? null,
            'title' => $r['title'] ?? null,
            'sub_type' => $r['sub_type'] ?? null,
            'date_1' => $r['date_1'] ?? null,
            'date_2' => $r['date_2'] ?? null,
            'date_3' => $r['date_3'] ?? null,
            'count_1' => isset($r['count_1']) ? (int)$r['count_1'] : null,
            'count_2' => isset($r['count_2']) ? (int)$r['count_2'] : null,
            'amount_1' => isset($r['amount_1']) ? (float)$r['amount_1'] : null,
            'amount_2' => isset($r['amount_2']) ? (float)$r['amount_2'] : null,
            'amount_3' => isset($r['amount_3']) ? (float)$r['amount_3'] : null,
            'level' => $r['level'] ?? null,
            'progress' => isset($r['progress']) ? (int)$r['progress'] : null,
            'responsible_person' => $r['responsible_person'] ?? null,
            'status' => $r['status'] ?? 'Pending',
            'notes' => $r['notes'] ?? null,
            'metadata' => $r['metadata'] ?? null,
            'created_by' => isset($r['created_by']) ? (int)$r['created_by'] : null,
            'updated_by' => isset($r['updated_by']) ? (int)$r['updated_by'] : null,
            'created_at' => $r['created_at'],
            'updated_at' => $r['updated_at']
        ];
    }
}
