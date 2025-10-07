<?php
declare(strict_types=1);

final class CompanyCosts
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
     * Add a cost entry (direct or operational).
     */
    public function add(array $data): array
    {
        $sql = "INSERT INTO company_costs (
                    tenant_id, client_id, company_id, program_id, cohort_id,
                    year_, cost_type, category_id, name, amount, note,
                    status_id, created_by, updated_by, created_at, updated_at
                ) VALUES (
                    :tenant_id, :client_id, :company_id, :program_id, :cohort_id,
                    :year_, :cost_type, :category_id, :name, :amount, :note,
                    :status_id, :created_by, :updated_by, NOW(), NOW()
                )";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            ':tenant_id'   => $data['tenant_id'] ?? null,
            ':client_id'   => $data['client_id'],
            ':company_id'  => $data['company_id'],
            ':program_id'  => $data['program_id'] ?? null,
            ':cohort_id'   => $data['cohort_id'] ?? null,
            ':year_'       => $data['year_'],
            ':cost_type'   => strtolower($data['cost_type'] ?? 'direct'),
            ':category_id' => $data['category_id'] ?? null,
            ':name'        => $data['name'],
            ':amount'      => $data['amount'] ?? 0,
            ':note'        => $data['note'] ?? null,
            ':status_id'   => $data['status_id'] ?? 1,
            ':created_by'  => $data['created_by'] ?? null,
            ':updated_by'  => $data['updated_by'] ?? null,
        ]);

        return $this->getById((int)$this->conn->lastInsertId());
    }

    /**
     * Update a cost entry.
     */
    public function update(int $id, array $fields): ?array
    {
        $allowed = [
            'cost_type','category_id','name','amount','note','status_id','updated_by'
        ];

        $sets = [];
        $params = [];
        foreach ($allowed as $col) {
            if (array_key_exists($col, $fields)) {
                $sets[] = "$col = :$col";
                $params[":$col"] = $fields[$col];
            }
        }

        if (!$sets) return $this->getById($id);

        $params[':id'] = $id;
        $sql = "UPDATE company_costs
                SET " . implode(', ', $sets) . ", updated_at = NOW()
                WHERE id = :id";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return $this->getById($id);
    }

    /* =========================================================================
       READ METHODS
       ========================================================================= */

    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM company_costs WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->cast($row) : null;
    }

    public function listByCompany(int $companyId): array
    {
        $stmt = $this->conn->prepare("SELECT * FROM company_costs WHERE company_id = ? ORDER BY year_ DESC, name ASC");
        $stmt->execute([$companyId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function listByYear(int $companyId, int $year): array
    {
        $stmt = $this->conn->prepare("SELECT * FROM company_costs WHERE company_id = ? AND year_ = ? ORDER BY cost_type, name ASC");
        $stmt->execute([$companyId, $year]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function listByType(int $companyId, string $type, ?int $year = null): array
    {
        $type = strtolower($type);
        $sql = "SELECT * FROM company_costs WHERE company_id = :company_id AND cost_type = :type";
        $params = [':company_id' => $companyId, ':type' => $type];

        if ($year !== null) {
            $sql .= " AND year_ = :year_";
            $params[':year_'] = $year;
        }

        $sql .= " ORDER BY name ASC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /* =========================================================================
       DELETE
       ========================================================================= */

    public function delete(int $id): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM company_costs WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    public function deleteByCompanyYear(int $companyId, int $year, string $type): int
    {
        $stmt = $this->conn->prepare("DELETE FROM company_costs WHERE company_id = ? AND year_ = ? AND cost_type = ?");
        $stmt->execute([$companyId, $year, strtolower($type)]);
        return $stmt->rowCount();
    }

    /* =========================================================================
       AGGREGATES / SUMMARIES
       ========================================================================= */

    /**
     * Get total cost amount by type for a company and year.
     */
    public function getTotalsByType(int $companyId, int $year): array
    {
        $sql = "SELECT
                    cost_type,
                    SUM(amount) AS total_amount
                FROM company_costs
                WHERE company_id = ? AND year_ = ?
                GROUP BY cost_type";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$companyId, $year]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $out = ['direct' => 0, 'operational' => 0];
        foreach ($rows as $r) {
            $out[$r['cost_type']] = (float)$r['total_amount'];
        }
        return $out;
    }

    public function getTotalsByCategory(int $companyId, int $year): array
    {
        $sql = "SELECT
                    c.category_id,
                    cat.name AS category_name,
                    c.cost_type,
                    SUM(c.amount) AS total_amount
                FROM company_costs c
                LEFT JOIN cost_categories cat ON cat.id = c.category_id
                WHERE c.company_id = ? AND c.year_ = ?
                GROUP BY c.category_id, c.cost_type, cat.name
                ORDER BY c.cost_type, cat.name";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$companyId, $year]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /* =========================================================================
       HELPERS
       ========================================================================= */

    private function cast(array $row): array
    {
        $ints = ['id','tenant_id','client_id','company_id','program_id','cohort_id','category_id','status_id','year_'];
        foreach ($ints as $k) {
            if (isset($row[$k]) && $row[$k] !== null) {
                $row[$k] = (int)$row[$k];
            }
        }
        if (isset($row['amount'])) {
            $row['amount'] = (float)$row['amount'];
        }
        $row['cost_type'] = strtolower((string)($row['cost_type'] ?? ''));
        return $row;
    }
}
