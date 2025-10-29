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

    /**
     * Get quarterly revenue calculation for a company and financial year.
     * Returns calculated quarterly totals from monthly data with proper financial year context.
     */
    public function getQuarterlyRevenue(int $companyId, int $financialYearId): array
    {
        // Get the financial year details and all stats for this company/year
        $sql = "SELECT
                    fs.*,
                    acc.account_type,
                    acc.account_name,
                    fy.start_month,
                    fy.end_month,
                    fy.fy_start_year,
                    fy.fy_end_year,
                    fy.name as financial_year_name
                FROM company_financial_yearly_stats fs
                LEFT JOIN company_accounts acc ON fs.account_id = acc.id
                LEFT JOIN financial_years fy ON fs.financial_year_id = fy.id
                WHERE fs.company_id = :company_id AND fs.financial_year_id = :financial_year_id";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            ':company_id' => $companyId,
            ':financial_year_id' => $financialYearId
        ]);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (!$records) {
            // If no records, still try to get financial year info for context
            $fyStmt = $this->conn->prepare("SELECT * FROM financial_years WHERE id = :fy_id");
            $fyStmt->execute([':fy_id' => $financialYearId]);
            $fyInfo = $fyStmt->fetch(PDO::FETCH_ASSOC);

            return [
                'financial_year_id' => $financialYearId,
                'financial_year_name' => $fyInfo['name'] ?? "FY $financialYearId",
                'fy_start_year' => $fyInfo['fy_start_year'] ?? null,
                'fy_end_year' => $fyInfo['fy_end_year'] ?? null,
                'start_month' => $fyInfo['start_month'] ?? 1,
                'revenue_q1' => 0,
                'revenue_q2' => 0,
                'revenue_q3' => 0,
                'revenue_q4' => 0,
                'revenue_total' => 0,
                'export_q1' => 0,
                'export_q2' => 0,
                'export_q3' => 0,
                'export_q4' => 0,
                'export_total' => 0,
                'export_ratio' => 0,
                'account_breakdown' => []
            ];
        }

        // Extract financial year information
        $firstRecord = $records[0];
        $startMonth = (int)($firstRecord['start_month'] ?? 1);
        $financialYearName = $firstRecord['financial_year_name'] ?? "FY " . $firstRecord['fy_start_year'] . "/" . substr((string)$firstRecord['fy_end_year'], -2);

        // Initialize monthly totals
        $domestic = array_fill(1, 12, 0.0);
        $export = array_fill(1, 12, 0.0);
        $accountBreakdown = [];

        // Aggregate monthly data by account type
        foreach ($records as $record) {
            $accountType = $record['account_type'] ?? 'domestic_revenue';
            $accountName = $record['account_name'] ?? 'Unknown Account';
            $accountId = $record['account_id'];

            // Track account-level breakdown
            $accountTotal = 0;
            $accountMonthly = [];

            for ($month = 1; $month <= 12; $month++) {
                $monthlyValue = (float)($record["m$month"] ?? 0);
                $accountMonthly["m$month"] = $monthlyValue;
                $accountTotal += $monthlyValue;

                if ($accountType === 'export_revenue') {
                    $export[$month] += $monthlyValue;
                } elseif ($accountType === 'domestic_revenue') {
                    $domestic[$month] += $monthlyValue;
                }
            }

            // Store account breakdown for detailed analysis
            $accountBreakdown[] = [
                'account_id' => $accountId,
                'account_name' => $accountName,
                'account_type' => $accountType,
                'monthly_data' => $accountMonthly,
                'total' => round($accountTotal, 2)
            ];
        }

        // Calculate quarterly totals directly from sequential months (m1-m12)
        // Q1 = months 1-3, Q2 = months 4-6, Q3 = months 7-9, Q4 = months 10-12
        $revenueQ1 = $domestic[1] + $domestic[2] + $domestic[3];
        $revenueQ2 = $domestic[4] + $domestic[5] + $domestic[6];
        $revenueQ3 = $domestic[7] + $domestic[8] + $domestic[9];
        $revenueQ4 = $domestic[10] + $domestic[11] + $domestic[12];
        $revenueTotal = array_sum($domestic);

        $exportQ1 = $export[1] + $export[2] + $export[3];
        $exportQ2 = $export[4] + $export[5] + $export[6];
        $exportQ3 = $export[7] + $export[8] + $export[9];
        $exportQ4 = $export[10] + $export[11] + $export[12];
        $exportTotal = array_sum($export);

        // Calculate export ratio
        $exportRatio = $revenueTotal > 0 ? ($exportTotal / $revenueTotal) * 100 : 0;

        return [
            'financial_year_id' => $financialYearId,
            'financial_year_name' => $financialYearName,
            'fy_start_year' => (int)$firstRecord['fy_start_year'],
            'fy_end_year' => (int)$firstRecord['fy_end_year'],
            'start_month' => $startMonth,
            'revenue_q1' => round($revenueQ1, 2),
            'revenue_q2' => round($revenueQ2, 2),
            'revenue_q3' => round($revenueQ3, 2),
            'revenue_q4' => round($revenueQ4, 2),
            'revenue_total' => round($revenueTotal, 2),
            'export_q1' => round($exportQ1, 2),
            'export_q2' => round($exportQ2, 2),
            'export_q3' => round($exportQ3, 2),
            'export_q4' => round($exportQ4, 2),
            'export_total' => round($exportTotal, 2),
            'export_ratio' => round($exportRatio, 2),
            'account_breakdown' => $accountBreakdown,
            'quarter_details' => [
                'q1_months' => ['Month 1', 'Month 2', 'Month 3'],
                'q2_months' => ['Month 4', 'Month 5', 'Month 6'],
                'q3_months' => ['Month 7', 'Month 8', 'Month 9'],
                'q4_months' => ['Month 10', 'Month 11', 'Month 12']
            ]
        ];
    }

    /**
     * Get quarterly revenue for all years of a company.
     */
    public function getQuarterlyRevenueAllYears(int $companyId): array
    {
        // Get all financial years that have data for this company
        $sql = "SELECT DISTINCT financial_year_id
                FROM company_financial_yearly_stats
                WHERE company_id = :company_id
                ORDER BY financial_year_id DESC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([':company_id' => $companyId]);
        $years = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $result = [];
        foreach ($years as $year) {
            $result[] = $this->getQuarterlyRevenue($companyId, (int)$year);
        }

        return $result;
    }

    /**
 * Get yearly revenue summary for a company and financial year.
 * Aggregates all monthly data for each revenue account and provides total and export breakdowns.
 */
public function getYearlyRevenue(int $companyId, int $financialYearId): array
{
    $sql = "SELECT
                fs.*,
                acc.account_type,
                acc.account_name,
                fy.name AS financial_year_name,
                fy.fy_start_year,
                fy.fy_end_year
            FROM company_financial_yearly_stats fs
            LEFT JOIN company_accounts acc ON fs.account_id = acc.id
            LEFT JOIN financial_years fy ON fs.financial_year_id = fy.id
            WHERE fs.company_id = :company_id
              AND fs.financial_year_id = :financial_year_id";

    $stmt = $this->conn->prepare($sql);
    $stmt->execute([
        ':company_id' => $companyId,
        ':financial_year_id' => $financialYearId
    ]);

    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!$records) {
        return [
            'financial_year_id' => $financialYearId,
            'financial_year_name' => "FY $financialYearId",
            'fy_start_year' => null,
            'fy_end_year' => null,
            'revenue_total' => 0,
            'export_total' => 0,
            'export_ratio' => 0,
            'account_breakdown' => []
        ];
    }

    // Initialize accumulators
    $domesticTotal = 0.0;
    $exportTotal = 0.0;
    $accountBreakdown = [];

    foreach ($records as $record) {
        $accountType = $record['account_type'] ?? 'domestic_revenue';
        $accountName = $record['account_name'] ?? 'Unknown Account';
        $accountId = $record['account_id'];
        $monthlySum = 0.0;

        // Sum up all months
        for ($m = 1; $m <= 12; $m++) {
            $monthlySum += (float)($record["m$m"] ?? 0);
        }

        // Assign totals based on account type
        if ($accountType === 'export_revenue') {
            $exportTotal += $monthlySum;
        } else {
            $domesticTotal += $monthlySum;
        }

        $accountBreakdown[] = [
            'account_id' => $accountId,
            'account_name' => $accountName,
            'account_type' => $accountType,
            'total' => round($monthlySum, 2)
        ];
    }

    $revenueTotal = $domesticTotal + $exportTotal;
    $exportRatio = $revenueTotal > 0 ? ($exportTotal / $revenueTotal) * 100 : 0;

    // Use first record for year context
    $first = $records[0];

    return [
        'financial_year_id' => $financialYearId,
        'financial_year_name' => $first['financial_year_name'] ?? "FY $financialYearId",
        'fy_start_year' => (int)$first['fy_start_year'],
        'fy_end_year' => (int)$first['fy_end_year'],
        'revenue_total' => round($revenueTotal, 2),
        'export_total' => round($exportTotal, 2),
        'export_ratio' => round($exportRatio, 2),
        'account_breakdown' => $accountBreakdown
    ];
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

    /**
     * Get quarter month names based on financial year start month and quarter offset.
     */
    private function getQuarterMonthNames(int $startMonth, int $quarterOffset): array
    {
        $monthNames = [
            1 => 'Jan', 2 => 'Feb', 3 => 'Mar', 4 => 'Apr', 5 => 'May', 6 => 'Jun',
            7 => 'Jul', 8 => 'Aug', 9 => 'Sep', 10 => 'Oct', 11 => 'Nov', 12 => 'Dec'
        ];

        $quarterMonths = [];
        for ($i = 0; $i < 3; $i++) {
            $monthIndex = (($startMonth - 1 + $quarterOffset + $i) % 12) + 1;
            $quarterMonths[] = $monthNames[$monthIndex];
        }

        return $quarterMonths;
    }

    /* =========================================================================
       LIVE PROFIT CALCULATIONS (Integration with company_financial_items)
       ========================================================================= */

    /**
     * Calculate live profit summary for a specific company and financial year
     * Combines revenue data with cost data from company_financial_items
     */
    public function getProfitSummary(int $companyId, int $financialYearId): ?array
    {
        // 1. Get revenue data using existing method
        $revenueData = $this->getQuarterlyRevenue($companyId, $financialYearId);
        if (!$revenueData) return null;

        // 2. Get the financial year details
        $fyStmt = $this->conn->prepare("SELECT fy_start_year FROM financial_years WHERE id = ?");
        $fyStmt->execute([$financialYearId]);
        $fyStartYear = $fyStmt->fetchColumn();

        if (!$fyStartYear) return null;

        // 3. Get cost data from company_financial_items
        $costStmt = $this->conn->prepare("
            SELECT
                item_type,
                SUM(amount) AS total_amount
            FROM company_financial_items
            WHERE company_id = :company_id
              AND year_ = :year
            GROUP BY item_type
        ");
        $costStmt->execute([
            ':company_id' => $companyId,
            ':year' => (int)$fyStartYear
        ]);

        $costs = [];
        while ($row = $costStmt->fetch(PDO::FETCH_ASSOC)) {
            $costs[$row['item_type']] = (float)$row['total_amount'];
        }

        // 4. Calculate profit metrics
        $revenue = $revenueData['revenue_total'];
        $directCosts = $costs['direct_cost'] ?? 0;
        $operationalCosts = $costs['operational_cost'] ?? 0;

        $grossProfit = $revenue - $directCosts;
        $operatingProfit = $grossProfit - $operationalCosts;

        // Calculate margins safely (avoid division by zero)
        $grossMargin = $revenue > 0 ? round(($grossProfit / $revenue) * 100, 2) : 0;
        $operatingMargin = $revenue > 0 ? round(($operatingProfit / $revenue) * 100, 2) : 0;

        return [
            // Financial Year Details
            'financial_year_id' => $revenueData['financial_year_id'],
            'financial_year_name' => $revenueData['financial_year_name'],
            'fy_start_year' => $revenueData['fy_start_year'],
            'fy_end_year' => $revenueData['fy_end_year'],

            // Revenue Breakdown
            'revenue_q1' => $revenueData['revenue_q1'],
            'revenue_q2' => $revenueData['revenue_q2'],
            'revenue_q3' => $revenueData['revenue_q3'],
            'revenue_q4' => $revenueData['revenue_q4'],
            'revenue_total' => $revenue,

            // Cost Breakdown
            'direct_costs' => round($directCosts, 2),
            'operational_costs' => round($operationalCosts, 2),
            'total_costs' => round($directCosts + $operationalCosts, 2),

            // Profit Metrics
            'gross_profit' => round($grossProfit, 2),
            'operating_profit' => round($operatingProfit, 2),
            'gross_margin' => $grossMargin,
            'operating_margin' => $operatingMargin,

            // Export Revenue (if available)
            'export_total' => $revenueData['export_total'] ?? 0,
            'export_ratio' => $revenueData['export_ratio'] ?? 0,

            // Quarter Details
            'quarter_details' => $revenueData['quarter_details'] ?? null
        ];
    }

    /**
     * Get profit summaries for all financial years for a company
     * Returns array of profit data across multiple years
     */
    public function getProfitSummaryAllYears(int $companyId): array
    {
        // Get all financial years that have either revenue or cost data
        $sql = "
            SELECT DISTINCT fy.id, fy.fy_start_year
            FROM financial_years fy
            WHERE EXISTS (
                SELECT 1 FROM company_financial_yearly_stats cfys
                WHERE cfys.company_id = :company_id1 AND cfys.financial_year_id = fy.id
            )
            OR EXISTS (
                SELECT 1 FROM company_financial_items cfi
                WHERE cfi.company_id = :company_id2 AND cfi.year_ = fy.fy_start_year
            )
            ORDER BY fy.fy_start_year DESC
        ";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            ':company_id1' => $companyId,
            ':company_id2' => $companyId
        ]);

        $financialYears = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $profitSummaries = [];

        foreach ($financialYears as $fy) {
            $profitData = $this->getProfitSummary($companyId, (int)$fy['id']);
            if ($profitData) {
                $profitSummaries[] = $profitData;
            }
        }

        return $profitSummaries;
    }

    /**
     * Get quarterly profit breakdown across years
     * Similar to quarterly revenue but includes cost and profit calculations
     */
    public function getQuarterlyProfitAllYears(int $companyId): array
    {
        $profitData = $this->getProfitSummaryAllYears($companyId);
        $quarterlyProfits = [];

        foreach ($profitData as $yearData) {
            // Calculate quarterly costs (distribute evenly for now - can be enhanced later)
            $directCostQuarterly = $yearData['direct_costs'] / 4;
            $operationalCostQuarterly = $yearData['operational_costs'] / 4;

            $quarterlyProfits[] = [
                'financial_year_id' => $yearData['financial_year_id'],
                'financial_year_name' => $yearData['financial_year_name'],
                'fy_start_year' => $yearData['fy_start_year'],
                'fy_end_year' => $yearData['fy_end_year'],

                // Quarterly Revenue
                'revenue_q1' => $yearData['revenue_q1'],
                'revenue_q2' => $yearData['revenue_q2'],
                'revenue_q3' => $yearData['revenue_q3'],
                'revenue_q4' => $yearData['revenue_q4'],

                // Quarterly Gross Profit (Revenue - Direct Costs)
                'gross_profit_q1' => round($yearData['revenue_q1'] - $directCostQuarterly, 2),
                'gross_profit_q2' => round($yearData['revenue_q2'] - $directCostQuarterly, 2),
                'gross_profit_q3' => round($yearData['revenue_q3'] - $directCostQuarterly, 2),
                'gross_profit_q4' => round($yearData['revenue_q4'] - $directCostQuarterly, 2),

                // Quarterly Operating Profit (Gross Profit - Operational Costs)
                'operating_profit_q1' => round($yearData['revenue_q1'] - $directCostQuarterly - $operationalCostQuarterly, 2),
                'operating_profit_q2' => round($yearData['revenue_q2'] - $directCostQuarterly - $operationalCostQuarterly, 2),
                'operating_profit_q3' => round($yearData['revenue_q3'] - $directCostQuarterly - $operationalCostQuarterly, 2),
                'operating_profit_q4' => round($yearData['revenue_q4'] - $directCostQuarterly - $operationalCostQuarterly, 2),

                // Annual Totals
                'gross_profit_total' => $yearData['gross_profit'],
                'operating_profit_total' => $yearData['operating_profit'],
                'gross_margin' => $yearData['gross_margin'],
                'operating_margin' => $yearData['operating_margin'],

                // Cost Details
                'direct_costs' => $yearData['direct_costs'],
                'operational_costs' => $yearData['operational_costs'],

                // Quarter Details
                'quarter_details' => $yearData['quarter_details']
            ];
        }

        return $quarterlyProfits;
    }
}
