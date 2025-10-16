<?php
declare(strict_types=1);

final class CompanyFinancialYearlyStats
{
    private PDO $conn;

    // Define writable fields for security
    private const WRITABLE = [
        'tenant_id', 'client_id', 'program_id', 'cohort_id', 'company_id',
        'account_id', 'financial_year_id',
        'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11', 'm12',
        'notes'
    ];

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /* =========================================================================
       CREATE / UPDATE
       ========================================================================= */

    public function add(array $data): array
    {
        $filteredData = $this->filterWritable($data);

        $sql = "INSERT INTO company_financial_yearly_stats (
                    tenant_id, client_id, program_id, cohort_id, company_id,
                    account_id, financial_year_id,
                    m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12,
                    notes, created_at, updated_at
                ) VALUES (
                    :tenant_id, :client_id, :program_id, :cohort_id, :company_id,
                    :account_id, :financial_year_id,
                    :m1, :m2, :m3, :m4, :m5, :m6, :m7, :m8, :m9, :m10, :m11, :m12,
                    :notes, NOW(), NOW()
                )";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            ':tenant_id'         => $filteredData['tenant_id'] ?? null,
            ':client_id'         => $filteredData['client_id'] ?? 1,
            ':program_id'        => $filteredData['program_id'] ?? null,
            ':cohort_id'         => $filteredData['cohort_id'] ?? null,
            ':company_id'        => $filteredData['company_id'],
            ':account_id'        => $filteredData['account_id'] ?? null,
            ':financial_year_id' => $filteredData['financial_year_id'],
            ':m1'                => $filteredData['m1'] ?? 0.00,
            ':m2'                => $filteredData['m2'] ?? 0.00,
            ':m3'                => $filteredData['m3'] ?? 0.00,
            ':m4'                => $filteredData['m4'] ?? 0.00,
            ':m5'                => $filteredData['m5'] ?? 0.00,
            ':m6'                => $filteredData['m6'] ?? 0.00,
            ':m7'                => $filteredData['m7'] ?? 0.00,
            ':m8'                => $filteredData['m8'] ?? 0.00,
            ':m9'                => $filteredData['m9'] ?? 0.00,
            ':m10'               => $filteredData['m10'] ?? 0.00,
            ':m11'               => $filteredData['m11'] ?? 0.00,
            ':m12'               => $filteredData['m12'] ?? 0.00,
            ':notes'             => $filteredData['notes'] ?? null,
        ]);

        $id = (int)$this->conn->lastInsertId();
        $result = $this->getById($id);

        return [
            'success' => true,
            'message' => 'Financial yearly stats created successfully',
            'data' => $result
        ];
    }

    /**
     * Update a yearly financial stat record.
     */
    public function update(int $id, array $fields): array
    {
        $filteredFields = $this->filterWritable($fields);
        $sets = [];
        $params = [];

        foreach ($filteredFields as $col => $value) {
            $sets[] = "$col = :$col";
            $params[":$col"] = $value;
        }

        if (!$sets) {
            $result = $this->getById($id);
            return [
                'success' => true,
                'message' => 'No changes made',
                'data' => $result
            ];
        }

        $params[':id'] = $id;
        $sql = "UPDATE company_financial_yearly_stats
                SET " . implode(', ', $sets) . ", updated_at = NOW()
                WHERE id = :id";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        $result = $this->getById($id);
        return [
            'success' => true,
            'message' => 'Financial yearly stats updated successfully',
            'data' => $result
        ];
    }

    /* =========================================================================
       READ METHODS
       ========================================================================= */

    /**
     * Get a single yearly stat record by ID.
     */
    public function getById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM company_financial_yearly_stats WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castEntity($row) : null;
    }

    /**
     * Get yearly stats by company and financial year.
     */
    public function getByCompanyAndYear(int $companyId, int $financialYearId, ?bool $isRevenue = null): array
    {
        $sql = "SELECT * FROM company_financial_yearly_stats
                WHERE company_id = :company_id AND financial_year_id = :financial_year_id";
        $params = [
            ':company_id' => $companyId,
            ':financial_year_id' => $financialYearId
        ];

        $sql .= " ORDER BY account_id ASC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        return array_map([$this, 'castEntity'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * Get yearly stats by company (all years).
     */
    public function getByCompany(int $companyId, ?bool $isRevenue = null): array
    {
        $sql = "SELECT * FROM company_financial_yearly_stats WHERE company_id = :company_id";
        $params = [':company_id' => $companyId];

        $sql .= " ORDER BY financial_year_id DESC, account_id ASC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        return array_map([$this, 'castEntity'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * Get revenue stats for a company and year.
     */
    public function getRevenueStats(int $companyId, int $financialYearId): array
    {
        return $this->getByCompanyAndYear($companyId, $financialYearId, true);
    }

    /**
     * Get expense stats for a company and year.
     */
    public function getExpenseStats(int $companyId, int $financialYearId): array
    {
        return $this->getByCompanyAndYear($companyId, $financialYearId, false);
    }

    /**
     * List all yearly stats with optional filters.
     */
    public function listAll(array $filters = []): array
    {
        $sql = "SELECT * FROM company_financial_yearly_stats WHERE 1=1";
        $params = [];

        // Apply filters
        if (isset($filters['company_id'])) {
            $sql .= " AND company_id = :company_id";
            $params[':company_id'] = (int)$filters['company_id'];
        }

        if (isset($filters['financial_year_id'])) {
            $sql .= " AND financial_year_id = :financial_year_id";
            $params[':financial_year_id'] = (int)$filters['financial_year_id'];
        }

        if (isset($filters['program_id'])) {
            $sql .= " AND program_id = :program_id";
            $params[':program_id'] = (int)$filters['program_id'];
        }

        if (isset($filters['cohort_id'])) {
            $sql .= " AND cohort_id = :cohort_id";
            $params[':cohort_id'] = (int)$filters['cohort_id'];
        }

        // Default ordering
        $sql .= " ORDER BY company_id ASC, financial_year_id DESC, account_id ASC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        return array_map([$this, 'castEntity'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * Get unique record by company, account, and year.
     */
    public function getByUniqueKey(int $companyId, ?int $accountId, int $financialYearId): ?array
    {
        $sql = "SELECT * FROM company_financial_yearly_stats
                WHERE company_id = :company_id
                AND financial_year_id = :financial_year_id";

        $params = [
            ':company_id' => $companyId,
            ':financial_year_id' => $financialYearId
        ];

        if ($accountId !== null) {
            $sql .= " AND account_id = :account_id";
            $params[':account_id'] = $accountId;
        } else {
            $sql .= " AND account_id IS NULL";
        }

        $sql .= " LIMIT 1";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castEntity($row) : null;
    }

    /* =========================================================================
       BUSINESS LOGIC METHODS
       ========================================================================= */

    /**
     * Upsert (insert or update) a yearly stat record.
     */
    public function upsert(array $data): array
    {
        $existing = $this->getByUniqueKey(
            (int)$data['company_id'],
            isset($data['account_id']) ? (int)$data['account_id'] : null,
            (int)$data['financial_year_id']
        );

        if ($existing) {
            return $this->update($existing['id'], $data);
        } else {
            return $this->add($data);
        }
    }

    /**
     * Calculate yearly totals for a company.
     */
    public function getYearlyTotals(int $companyId, int $financialYearId): array
    {
        $sql = "SELECT
                    is_revenue,
                    SUM(total_amount) as yearly_total,
                    COUNT(*) as account_count
                FROM company_financial_yearly_stats
                WHERE company_id = :company_id AND financial_year_id = :financial_year_id
                GROUP BY is_revenue";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            ':company_id' => $companyId,
            ':financial_year_id' => $financialYearId
        ]);

        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $totals = [
            'revenue_total' => 0,
            'expense_total' => 0,
            'revenue_accounts' => 0,
            'expense_accounts' => 0,
            'net_total' => 0
        ];

        foreach ($results as $row) {
            if ($row['is_revenue']) {
                $totals['revenue_total'] = (float)$row['yearly_total'];
                $totals['revenue_accounts'] = (int)$row['account_count'];
            } else {
                $totals['expense_total'] = (float)$row['yearly_total'];
                $totals['expense_accounts'] = (int)$row['account_count'];
            }
        }

        $totals['net_total'] = $totals['revenue_total'] - $totals['expense_total'];

        return $totals;
    }

    /**
     * Get monthly breakdown for a company and year.
     */
    public function getMonthlyBreakdown(int $companyId, int $financialYearId): array
    {
        $sql = "SELECT
                    is_revenue,
                    SUM(m1) as m1_total, SUM(m2) as m2_total, SUM(m3) as m3_total,
                    SUM(m4) as m4_total, SUM(m5) as m5_total, SUM(m6) as m6_total,
                    SUM(m7) as m7_total, SUM(m8) as m8_total, SUM(m9) as m9_total,
                    SUM(m10) as m10_total, SUM(m11) as m11_total, SUM(m12) as m12_total
                FROM company_financial_yearly_stats
                WHERE company_id = :company_id AND financial_year_id = :financial_year_id
                GROUP BY is_revenue";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            ':company_id' => $companyId,
            ':financial_year_id' => $financialYearId
        ]);

        return array_map([$this, 'castEntity'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /* =========================================================================
       DELETE / STATUS
       ========================================================================= */

    public function delete(int $id): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM company_financial_yearly_stats WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    public function deleteByCompanyAndYear(int $companyId, int $financialYearId): int
    {
        $stmt = $this->conn->prepare("DELETE FROM company_financial_yearly_stats WHERE company_id = ? AND financial_year_id = ?");
        $stmt->execute([$companyId, $financialYearId]);
        return $stmt->rowCount();
    }

    /* =========================================================================
       HELPERS
       ========================================================================= */

    private function filterWritable(array $data): array
    {
        return array_intersect_key($data, array_flip(self::WRITABLE));
    }

    private function castEntity(array $row): array
    {
        // Cast integer fields
        $intFields = [
            'id', 'tenant_id', 'client_id', 'program_id', 'cohort_id',
            'company_id', 'account_id', 'financial_year_id'
        ];

        foreach ($intFields as $field) {
            if (isset($row[$field]) && $row[$field] !== null) {
                $row[$field] = (int)$row[$field];
            }
        }

        // Cast decimal fields
        $decimalFields = [
            'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11', 'm12', 'total_amount'
        ];

        foreach ($decimalFields as $field) {
            if (isset($row[$field]) && $row[$field] !== null) {
                $row[$field] = (float)$row[$field];
            }
        }

        return $row;
    }
}
