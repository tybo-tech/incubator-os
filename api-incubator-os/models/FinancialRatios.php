<?php
declare(strict_types=1);

final class FinancialRatios
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
     * Add a new financial ratio record.
     */
    public function add(array $data): array
    {
        $sql = "INSERT INTO financial_ratios (
                    tenant_id, client_id, company_id, program_id, cohort_id,
                    year_, group_name, title,
                    variable1_name, variable1_value,
                    variable2_name, variable2_value,
                    ratio_value, min_target, ideal_target,
                    notes, status_id, created_by, updated_by, created_at, updated_at
                ) VALUES (
                    :tenant_id, :client_id, :company_id, :program_id, :cohort_id,
                    :year_, :group_name, :title,
                    :v1_name, :v1_value,
                    :v2_name, :v2_value,
                    :ratio_value, :min_target, :ideal_target,
                    :notes, :status_id, :created_by, :updated_by, NOW(), NOW()
                )";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            ':tenant_id'   => $data['tenant_id'] ?? null,
            ':client_id'   => $data['client_id'],
            ':company_id'  => $data['company_id'],
            ':program_id'  => $data['program_id'] ?? null,
            ':cohort_id'   => $data['cohort_id'] ?? null,
            ':year_'       => $data['year_'],
            ':group_name'  => $data['group_name'],
            ':title'       => $data['title'],
            ':v1_name'     => $data['variable1_name'] ?? null,
            ':v1_value'    => $data['variable1_value'] ?? null,
            ':v2_name'     => $data['variable2_name'] ?? null,
            ':v2_value'    => $data['variable2_value'] ?? null,
            ':ratio_value' => $data['ratio_value'] ?? null,
            ':min_target'  => $data['min_target'] ?? null,
            ':ideal_target'=> $data['ideal_target'] ?? null,
            ':notes'       => $data['notes'] ?? null,
            ':status_id'   => $data['status_id'] ?? 1,
            ':created_by'  => $data['created_by'] ?? null,
            ':updated_by'  => $data['updated_by'] ?? null,
        ]);

        return $this->getById((int)$this->conn->lastInsertId());
    }

    /**
     * Update an existing ratio record.
     */
    public function update(int $id, array $fields): ?array
    {
        $allowed = [
            'group_name', 'title', 'variable1_name', 'variable1_value',
            'variable2_name', 'variable2_value', 'ratio_value',
            'min_target', 'ideal_target', 'notes', 'status_id'
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
        $sql = "UPDATE financial_ratios
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
        $stmt = $this->conn->prepare("SELECT * FROM financial_ratios WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->cast($row) : null;
    }

    /**
     * Get all ratios for a given company/year grouped by category.
     */
    public function listByCompanyAndYear(int $companyId, int $year): array
    {
        $stmt = $this->conn->prepare("
            SELECT * FROM financial_ratios
            WHERE company_id = :company_id AND year_ = :year_
            ORDER BY group_name ASC, title ASC
        ");
        $stmt->execute([':company_id' => $companyId, ':year_' => $year]);
        return array_map([$this, 'cast'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * Get ratios by category (Profitability, Liquidity, etc.).
     */
    public function listByGroup(int $companyId, int $year, string $group): array
    {
        $stmt = $this->conn->prepare("
            SELECT * FROM financial_ratios
            WHERE company_id = :company_id AND year_ = :year_ AND group_name = :group
            ORDER BY title ASC
        ");
        $stmt->execute([
            ':company_id' => $companyId,
            ':year_' => $year,
            ':group' => $group
        ]);
        return array_map([$this, 'cast'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /* =========================================================================
       CALCULATIONS / TRIGGERS
       ========================================================================= */

    /**
     * Automatically recalculate ratios based on the latest financial data.
     * Called by other modules (e.g. Revenue, CostStructure, BalanceSheet).
     */
    public function recalculateForCompany(int $companyId, int $year, array $financials): void
    {
        // Expected structure:
        // $financials = [
        //     'revenue' => 60000,
        //     'gross_profit' => 32000,
        //     'net_profit' => 3200,
        //     'liquid_assets' => 20000,
        //     'medium_liabilities' => 15000,
        //     'total_liabilities' => 15000,
        //     'total_equity' => 10000,
        //     'total_assets' => 25000
        // ];

        $ratios = [
            [
                'group_name' => 'Profitability Ratios',
                'title' => 'Gross Profit Margin',
                'v1_name' => 'Gross Profit',
                'v1_value' => $financials['gross_profit'] ?? 0,
                'v2_name' => 'Revenue',
                'v2_value' => $financials['revenue'] ?? 0,
                'ratio_value' => $this->calcRatio($financials['gross_profit'] ?? 0, $financials['revenue'] ?? 0)
            ],
            [
                'group_name' => 'Profitability Ratios',
                'title' => 'Net Profit Margin',
                'v1_name' => 'Net Profit Before Tax',
                'v1_value' => $financials['net_profit'] ?? 0,
                'v2_name' => 'Revenue',
                'v2_value' => $financials['revenue'] ?? 0,
                'ratio_value' => $this->calcRatio($financials['net_profit'] ?? 0, $financials['revenue'] ?? 0)
            ],
            [
                'group_name' => 'Liquidity Ratios',
                'title' => 'Current Ratio',
                'v1_name' => 'Liquid Assets',
                'v1_value' => $financials['liquid_assets'] ?? 0,
                'v2_name' => 'Medium-term Liabilities',
                'v2_value' => $financials['medium_liabilities'] ?? 0,
                'ratio_value' => $this->calcRatio($financials['liquid_assets'] ?? 0, $financials['medium_liabilities'] ?? 0)
            ],
            [
                'group_name' => 'Solvency Ratios',
                'title' => 'Leverage Ratio',
                'v1_name' => 'Total Liabilities',
                'v1_value' => $financials['total_liabilities'] ?? 0,
                'v2_name' => 'Total Equity',
                'v2_value' => $financials['total_equity'] ?? 0,
                'ratio_value' => $this->calcRatio($financials['total_liabilities'] ?? 0, $financials['total_equity'] ?? 0)
            ],
        ];

        foreach ($ratios as $ratio) {
            $this->upsertRatio($companyId, $year, $ratio);
        }
    }

    /**
     * Helper to upsert (insert or update) a ratio.
     */
    private function upsertRatio(int $companyId, int $year, array $r): void
    {
        $stmt = $this->conn->prepare("
            SELECT id FROM financial_ratios
            WHERE company_id = :company_id AND year_ = :year_ AND title = :title
            LIMIT 1
        ");
        $stmt->execute([
            ':company_id' => $companyId,
            ':year_' => $year,
            ':title' => $r['title']
        ]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            $this->update((int)$existing['id'], [
                'variable1_name' => $r['v1_name'],
                'variable1_value' => $r['v1_value'],
                'variable2_name' => $r['v2_name'],
                'variable2_value' => $r['v2_value'],
                'ratio_value' => $r['ratio_value']
            ]);
        } else {
            $this->add([
                'tenant_id' => null,
                'client_id' => 1,
                'company_id' => $companyId,
                'program_id' => null,
                'cohort_id' => null,
                'year_' => $year,
                'group_name' => $r['group_name'],
                'title' => $r['title'],
                'variable1_name' => $r['v1_name'],
                'variable1_value' => $r['v1_value'],
                'variable2_name' => $r['v2_name'],
                'variable2_value' => $r['v2_value'],
                'ratio_value' => $r['ratio_value'],
                'status_id' => 1
            ]);
        }
    }

    /* =========================================================================
       DELETE / STATUS
       ========================================================================= */

    public function delete(int $id): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM financial_ratios WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    public function setActiveStatus(int $id, bool $active): bool
    {
        $stmt = $this->conn->prepare("
            UPDATE financial_ratios
            SET status_id = ?, updated_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$active ? 1 : 0, $id]);
        return $stmt->rowCount() > 0;
    }

    /* =========================================================================
       HELPERS
       ========================================================================= */

    private function calcRatio(float $v1, float $v2): ?float
    {
        if ($v2 == 0) return null;
        return round(($v1 / $v2) * 100, 2);
    }

    private function cast(array $row): array
    {
        $row['id'] = (int)($row['id'] ?? 0);
        $row['ratio_value'] = isset($row['ratio_value']) ? (float)$row['ratio_value'] : null;
        $row['min_target'] = isset($row['min_target']) ? (float)$row['min_target'] : null;
        $row['ideal_target'] = isset($row['ideal_target']) ? (float)$row['ideal_target'] : null;
        $row['status_id'] = (int)($row['status_id'] ?? 1);
        return $row;
    }
}
