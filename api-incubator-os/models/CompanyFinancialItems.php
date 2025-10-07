<?php
declare(strict_types=1);

final class CompanyFinancialItems
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
     * Add a financial item (works for cost, asset, liability, equity, etc.)
     */
    public function add(array $data): array
    {
        $sql = "INSERT INTO company_financial_items (
                    tenant_id, client_id, company_id, program_id, cohort_id, year_,
                    item_type, category_id, name, amount, note,
                    status_id, created_by, updated_by, created_at, updated_at
                ) VALUES (
                    :tenant_id, :client_id, :company_id, :program_id, :cohort_id, :year_,
                    :item_type, :category_id, :name, :amount, :note,
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
            ':item_type'   => strtolower($data['item_type']),
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
     * Update a financial item.
     */
    public function update(int $id, array $fields): ?array
    {
        $allowed = [
            'item_type','category_id','name','amount','note','status_id','updated_by'
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
        $sql = "UPDATE company_financial_items
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
        $stmt = $this->conn->prepare("SELECT * FROM company_financial_items WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->cast($row) : null;
    }

    public function listByCompany(int $companyId, ?string $type = null, ?int $year = null): array
    {
        $sql = "SELECT * FROM company_financial_items WHERE company_id = :company_id";
        $params = [':company_id' => $companyId];

        if ($type) {
            $sql .= " AND item_type = :type";
            $params[':type'] = strtolower($type);
        }
        if ($year) {
            $sql .= " AND year_ = :year_";
            $params[':year_'] = $year;
        }

        $sql .= " ORDER BY year_ DESC, name ASC";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return array_map([$this, 'cast'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function listByType(string $type, ?int $companyId = null, ?int $year = null): array
    {
        $sql = "SELECT * FROM company_financial_items WHERE item_type = :type";
        $params = [':type' => strtolower($type)];

        if ($companyId) {
            $sql .= " AND company_id = :company_id";
            $params[':company_id'] = $companyId;
        }
        if ($year) {
            $sql .= " AND year_ = :year_";
            $params[':year_'] = $year;
        }

        $sql .= " ORDER BY name ASC";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return array_map([$this, 'cast'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /* =========================================================================
       DELETE
       ========================================================================= */

    public function delete(int $id): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM company_financial_items WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    public function deleteByCompanyYear(int $companyId, int $year, string $type): int
    {
        $stmt = $this->conn->prepare("
            DELETE FROM company_financial_items
            WHERE company_id = ? AND year_ = ? AND item_type = ?
        ");
        $stmt->execute([$companyId, $year, strtolower($type)]);
        return $stmt->rowCount();
    }

    /* =========================================================================
       AGGREGATES / SUMMARIES
       ========================================================================= */

    /**
     * Get total amount per item_type (assets, liabilities, costs, etc.)
     */
    public function getTotalsByType(int $companyId, int $year): array
    {
        $sql = "SELECT item_type, SUM(amount) AS total_amount
                FROM company_financial_items
                WHERE company_id = ? AND year_ = ?
                GROUP BY item_type";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$companyId, $year]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $out = [];
        foreach ($rows as $r) {
            $out[$r['item_type']] = (float)$r['total_amount'];
        }
        return $out;
    }

    /**
     * Totals grouped by category and type.
     */
    public function getTotalsByCategory(int $companyId, int $year): array
    {
        $sql = "SELECT
                    fi.category_id,
                    fc.name AS category_name,
                    fi.item_type,
                    SUM(fi.amount) AS total_amount
                FROM company_financial_items fi
                LEFT JOIN financial_categories fc ON fc.id = fi.category_id
                WHERE fi.company_id = ? AND fi.year_ = ?
                GROUP BY fi.category_id, fi.item_type, fc.name
                ORDER BY fi.item_type, fc.name";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$companyId, $year]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /* =========================================================================
       HELPERS
       ========================================================================= */

    private function cast(array $row): array
    {
        $ints = [
            'id','tenant_id','client_id','company_id','program_id',
            'cohort_id','category_id','status_id','year_'
        ];
        foreach ($ints as $k) {
            if (isset($row[$k]) && $row[$k] !== null) {
                $row[$k] = (int)$row[$k];
            }
        }

        if (isset($row['amount'])) {
            $row['amount'] = (float)$row['amount'];
        }

        $row['item_type'] = strtolower((string)($row['item_type'] ?? ''));
        return $row;
    }
}
