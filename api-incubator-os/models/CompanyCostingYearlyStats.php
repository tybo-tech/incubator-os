<?php
declare(strict_types=1);

final class CompanyCostingYearlyStats
{
    private PDO $conn;

    // Define writable fields for security
    private const WRITABLE = [
        'tenant_id', 'client_id', 'program_id', 'cohort_id', 'company_id',
        'financial_year_id', 'cost_type', 'category_id', 'subcategory_id',
        'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11', 'm12',
        'notes'
    ];

    // Valid cost types
    private const VALID_COST_TYPES = ['direct', 'operational'];

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /* =========================================================================
       CREATE / UPDATE
       ========================================================================= */

    /**
     * Create a company costing yearly stats record
     */
    public function addCompanyCostingYearlyStats(array $data): array
    {
        $this->validateCostingData($data);

        $sql = "INSERT INTO company_costing_yearly_stats (
            tenant_id, client_id, program_id, cohort_id, company_id,
            financial_year_id, cost_type, category_id, subcategory_id,
            m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            $data['tenant_id'] ?? null,
            $data['client_id'] ?? 1,
            $data['program_id'] ?? null,
            $data['cohort_id'] ?? null,
            $data['company_id'],
            $data['financial_year_id'],
            $data['cost_type'] ?? 'direct',
            $data['category_id'] ?? null,
            $data['subcategory_id'] ?? null,
            $data['m1'] ?? 0.00,
            $data['m2'] ?? 0.00,
            $data['m3'] ?? 0.00,
            $data['m4'] ?? 0.00,
            $data['m5'] ?? 0.00,
            $data['m6'] ?? 0.00,
            $data['m7'] ?? 0.00,
            $data['m8'] ?? 0.00,
            $data['m9'] ?? 0.00,
            $data['m10'] ?? 0.00,
            $data['m11'] ?? 0.00,
            $data['m12'] ?? 0.00,
            $data['notes'] ?? null
        ]);

        return $this->getCompanyCostingYearlyStatsById((int)$this->conn->lastInsertId());
    }

    /**
     * Update company costing yearly stats record
     */
    public function updateCompanyCostingYearlyStats(int $id, array $fields): ?array
    {
        $current = $this->getCompanyCostingYearlyStatsById($id);
        if (!$current) return null;

        $filtered = $this->filterWritable($fields);
        if (empty($filtered)) return $current;

        // Validate cost_type if being updated
        if (isset($filtered['cost_type'])) {
            $this->validateCostType($filtered['cost_type']);
        }

        $sets = [];
        $params = [];
        foreach ($filtered as $key => $value) {
            $sets[] = "$key = ?";
            $params[] = $value;
        }

        $params[] = $id;
        $sql = "UPDATE company_costing_yearly_stats SET " . implode(', ', $sets) . " WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        return $this->getCompanyCostingYearlyStatsById($id);
    }

    /**
     * Bulk update monthly values for a costing record
     */
    public function updateMonthlyValues(int $id, array $monthlyData): ?array
    {
        $current = $this->getCompanyCostingYearlyStatsById($id);
        if (!$current) return null;

        $validMonths = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11', 'm12'];
        $filtered = array_intersect_key($monthlyData, array_flip($validMonths));

        if (empty($filtered)) return $current;

        // Validate monthly values are numeric
        foreach ($filtered as $month => $value) {
            if (!is_numeric($value)) {
                throw new InvalidArgumentException("Monthly value for $month must be numeric");
            }
        }

        return $this->updateCompanyCostingYearlyStats($id, $filtered);
    }

    /* =========================================================================
       READ
       ========================================================================= */

    /**
     * Get company costing yearly stats by ID
     */
    public function getCompanyCostingYearlyStatsById(int $id): ?array
    {
        $stmt = $this->conn->prepare("SELECT * FROM company_costing_yearly_stats WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castCostingStats($row) : null;
    }

    /**
     * List company costing yearly stats with filters
     */
    public function listCompanyCostingYearlyStats(array $filters = []): array
    {
        $where = [];
        $params = [];

        if (!empty($filters['company_id'])) {
            $where[] = 'company_id = ?';
            $params[] = (int)$filters['company_id'];
        }

        if (!empty($filters['financial_year_id'])) {
            $where[] = 'financial_year_id = ?';
            $params[] = (int)$filters['financial_year_id'];
        }

        if (!empty($filters['cost_type'])) {
            $where[] = 'cost_type = ?';
            $params[] = $filters['cost_type'];
        }

        if (!empty($filters['category_id'])) {
            $where[] = 'category_id = ?';
            $params[] = (int)$filters['category_id'];
        }

        if (!empty($filters['client_id'])) {
            $where[] = 'client_id = ?';
            $params[] = (int)$filters['client_id'];
        }

        if (!empty($filters['program_id'])) {
            $where[] = 'program_id = ?';
            $params[] = (int)$filters['program_id'];
        }

        if (!empty($filters['cohort_id'])) {
            $where[] = 'cohort_id = ?';
            $params[] = (int)$filters['cohort_id'];
        }

        $sql = "SELECT * FROM company_costing_yearly_stats";
        if ($where) {
            $sql .= " WHERE " . implode(' AND ', $where);
        }
        $sql .= " ORDER BY id ASC"; // Excel-like ordering: oldest records first

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        $results = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $results[] = $this->castCostingStats($row);
        }

        return $results;
    }

    /**
     * Get costing stats for a specific company and financial year
     */
    public function getCompanyCostingByYear(int $companyId, int $financialYearId, ?string $costType = null): array
    {
        $filters = [
            'company_id' => $companyId,
            'financial_year_id' => $financialYearId
        ];

        if ($costType) {
            $filters['cost_type'] = $costType;
        }

        return $this->listCompanyCostingYearlyStats($filters);
    }

    /**
     * Get costing stats by category for a company and year
     */
    public function getCompanyCostingByCategory(int $companyId, int $financialYearId, int $categoryId): array
    {
        return $this->listCompanyCostingYearlyStats([
            'company_id' => $companyId,
            'financial_year_id' => $financialYearId,
            'category_id' => $categoryId
        ]);
    }

    /**
     * Get aggregated costing summary for a company and year
     */
    public function getCompanyCostingSummary(int $companyId, int $financialYearId): array
    {
        $sql = "SELECT
            cost_type,
            COUNT(*) as record_count,
            SUM(total_amount) as total_cost,
            SUM(m1) as jan_total, SUM(m2) as feb_total, SUM(m3) as mar_total,
            SUM(m4) as apr_total, SUM(m5) as may_total, SUM(m6) as jun_total,
            SUM(m7) as jul_total, SUM(m8) as aug_total, SUM(m9) as sep_total,
            SUM(m10) as oct_total, SUM(m11) as nov_total, SUM(m12) as dec_total
        FROM company_costing_yearly_stats
        WHERE company_id = ? AND financial_year_id = ?
        GROUP BY cost_type";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$companyId, $financialYearId]);

        $summary = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $summary[$row['cost_type']] = [
                'cost_type' => $row['cost_type'],
                'record_count' => (int)$row['record_count'],
                'total_cost' => (float)$row['total_cost'],
                'monthly_totals' => [
                    'm1' => (float)$row['jan_total'],
                    'm2' => (float)$row['feb_total'],
                    'm3' => (float)$row['mar_total'],
                    'm4' => (float)$row['apr_total'],
                    'm5' => (float)$row['may_total'],
                    'm6' => (float)$row['jun_total'],
                    'm7' => (float)$row['jul_total'],
                    'm8' => (float)$row['aug_total'],
                    'm9' => (float)$row['sep_total'],
                    'm10' => (float)$row['oct_total'],
                    'm11' => (float)$row['nov_total'],
                    'm12' => (float)$row['dec_total']
                ]
            ];
        }

        return $summary;
    }

    /**
     * Get costing comparison between years
     */
    public function getCompanyCostingComparison(int $companyId, array $financialYearIds): array
    {
        if (empty($financialYearIds)) {
            return [];
        }

        $placeholders = str_repeat('?,', count($financialYearIds) - 1) . '?';
        $sql = "SELECT
            financial_year_id,
            cost_type,
            SUM(total_amount) as total_cost
        FROM company_costing_yearly_stats
        WHERE company_id = ? AND financial_year_id IN ($placeholders)
        GROUP BY financial_year_id, cost_type
        ORDER BY financial_year_id, cost_type";

        $params = array_merge([$companyId], $financialYearIds);
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);

        $comparison = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $yearId = (int)$row['financial_year_id'];
            if (!isset($comparison[$yearId])) {
                $comparison[$yearId] = ['financial_year_id' => $yearId, 'costs' => []];
            }
            $comparison[$yearId]['costs'][$row['cost_type']] = (float)$row['total_cost'];
        }

        return array_values($comparison);
    }

    /* =========================================================================
       DELETE
       ========================================================================= */

    /**
     * Delete a company costing yearly stats record
     */
    public function deleteCompanyCostingYearlyStats(int $id): bool
    {
        $stmt = $this->conn->prepare("DELETE FROM company_costing_yearly_stats WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    /**
     * Delete all costing records for a company and year
     */
    public function deleteCompanyCostingByYear(int $companyId, int $financialYearId): int
    {
        $stmt = $this->conn->prepare("DELETE FROM company_costing_yearly_stats WHERE company_id = ? AND financial_year_id = ?");
        $stmt->execute([$companyId, $financialYearId]);
        return $stmt->rowCount();
    }

    /* =========================================================================
       BUSINESS LOGIC
       ========================================================================= */

    /**
     * Upsert costing data (insert or update if exists)
     */
    public function upsertCompanyCosting(array $data): array
    {
        $this->validateCostingData($data);

        // Check if record exists with unique constraint
        $existing = $this->findExistingRecord(
            $data['company_id'],
            $data['financial_year_id'],
            $data['cost_type'] ?? 'direct',
            $data['category_id'] ?? null
        );

        if ($existing) {
            return $this->updateCompanyCostingYearlyStats($existing['id'], $data);
        } else {
            return $this->addCompanyCostingYearlyStats($data);
        }
    }

    /**
     * Copy costing data from one year to another
     */
    public function copyCostingToNewYear(int $companyId, int $fromYearId, int $toYearId): array
    {
        $sourceData = $this->getCompanyCostingByYear($companyId, $fromYearId);
        $copiedRecords = [];

        foreach ($sourceData as $record) {
            $newData = $record;
            unset($newData['id'], $newData['created_at'], $newData['updated_at'], $newData['total_amount']);
            $newData['financial_year_id'] = $toYearId;

            // Reset monthly values to 0 for new year
            for ($i = 1; $i <= 12; $i++) {
                $newData["m$i"] = 0.00;
            }

            try {
                $copiedRecords[] = $this->addCompanyCostingYearlyStats($newData);
            } catch (Exception $e) {
                // Skip if record already exists (due to unique constraint)
                continue;
            }
        }

        return $copiedRecords;
    }

    /* =========================================================================
       PRIVATE HELPERS
       ========================================================================= */

    /**
     * Filter input to only writable fields
     */
    private function filterWritable(array $data): array
    {
        return array_intersect_key($data, array_flip(self::WRITABLE));
    }

    /**
     * Cast database row to proper types
     */
    private function castCostingStats(array $row): array
    {
        return [
            'id' => (int)$row['id'],
            'tenant_id' => $row['tenant_id'] ? (int)$row['tenant_id'] : null,
            'client_id' => (int)$row['client_id'],
            'program_id' => $row['program_id'] ? (int)$row['program_id'] : null,
            'cohort_id' => $row['cohort_id'] ? (int)$row['cohort_id'] : null,
            'company_id' => (int)$row['company_id'],
            'financial_year_id' => (int)$row['financial_year_id'],
            'cost_type' => (string)$row['cost_type'],
            'category_id' => $row['category_id'] ? (int)$row['category_id'] : null,
            'subcategory_id' => $row['subcategory_id'] ? (int)$row['subcategory_id'] : null,
            'm1' => (float)$row['m1'],
            'm2' => (float)$row['m2'],
            'm3' => (float)$row['m3'],
            'm4' => (float)$row['m4'],
            'm5' => (float)$row['m5'],
            'm6' => (float)$row['m6'],
            'm7' => (float)$row['m7'],
            'm8' => (float)$row['m8'],
            'm9' => (float)$row['m9'],
            'm10' => (float)$row['m10'],
            'm11' => (float)$row['m11'],
            'm12' => (float)$row['m12'],
            'total_amount' => (float)$row['total_amount'],
            'notes' => $row['notes'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at']
        ];
    }

    /**
     * Validate costing data
     */
    private function validateCostingData(array $data): void
    {
        if (empty($data['company_id'])) {
            throw new InvalidArgumentException("Company ID is required");
        }

        if (empty($data['financial_year_id'])) {
            throw new InvalidArgumentException("Financial Year ID is required");
        }

        if (isset($data['cost_type'])) {
            $this->validateCostType($data['cost_type']);
        }

        // Validate monthly values are numeric if provided
        for ($i = 1; $i <= 12; $i++) {
            $month = "m$i";
            if (isset($data[$month]) && !is_numeric($data[$month])) {
                throw new InvalidArgumentException("Monthly value for $month must be numeric");
            }
        }
    }

    /**
     * Validate cost type
     */
    private function validateCostType(string $costType): void
    {
        if (!in_array($costType, self::VALID_COST_TYPES)) {
            throw new InvalidArgumentException("Invalid cost type. Must be one of: " . implode(', ', self::VALID_COST_TYPES));
        }
    }

    /**
     * Find existing record by unique constraint
     */
    private function findExistingRecord(int $companyId, int $financialYearId, string $costType, ?int $categoryId): ?array
    {
        if ($categoryId === null) {
            $sql = "SELECT * FROM company_costing_yearly_stats
                    WHERE company_id = ? AND financial_year_id = ? AND cost_type = ? AND category_id IS NULL
                    LIMIT 1";
            $params = [$companyId, $financialYearId, $costType];
        } else {
            $sql = "SELECT * FROM company_costing_yearly_stats
                    WHERE company_id = ? AND financial_year_id = ? AND cost_type = ? AND category_id = ?
                    LIMIT 1";
            $params = [$companyId, $financialYearId, $costType, $categoryId];
        }

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->castCostingStats($row) : null;
    }

    /* =========================================================================
       QUARTERLY COST CALCULATIONS
       ========================================================================= */

    /**
     * Get quarterly cost calculation for a company and financial year.
     * Returns calculated quarterly totals from monthly data with proper financial year context.
     * Separates direct and operational costs.
     */
    public function getQuarterlyCosts(int $companyId, int $financialYearId): array
    {
        // Get the financial year details and all costing stats for this company/year
        $sql = "SELECT
                    cs.*,
                    cat.name as category_name,
                    fy.start_month,
                    fy.end_month,
                    fy.fy_start_year,
                    fy.fy_end_year,
                    fy.name as financial_year_name
                FROM company_costing_yearly_stats cs
                LEFT JOIN cost_categories cat ON cs.category_id = cat.id
                LEFT JOIN financial_years fy ON cs.financial_year_id = fy.id
                WHERE cs.company_id = :company_id AND cs.financial_year_id = :financial_year_id";

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
                'direct_q1' => 0,
                'direct_q2' => 0,
                'direct_q3' => 0,
                'direct_q4' => 0,
                'direct_total' => 0,
                'operational_q1' => 0,
                'operational_q2' => 0,
                'operational_q3' => 0,
                'operational_q4' => 0,
                'operational_total' => 0,
                'total_costs_q1' => 0,
                'total_costs_q2' => 0,
                'total_costs_q3' => 0,
                'total_costs_q4' => 0,
                'total_costs' => 0,
                'category_breakdown' => []
            ];
        }

        // Extract financial year information
        $firstRecord = $records[0];
        $startMonth = (int)($firstRecord['start_month'] ?? 1);
        $financialYearName = $firstRecord['financial_year_name'] ?? "FY " . $firstRecord['fy_start_year'] . "/" . substr((string)$firstRecord['fy_end_year'], -2);

        // Initialize monthly totals
        $directCosts = array_fill(1, 12, 0.0);
        $operationalCosts = array_fill(1, 12, 0.0);
        $categoryBreakdown = [];

        // Aggregate monthly data by cost type and category
        foreach ($records as $record) {
            $costType = $record['cost_type'] ?? 'direct';
            $categoryName = $record['category_name'] ?? 'Uncategorized';
            $categoryId = $record['category_id'];

            // Track category-level breakdown
            $categoryTotal = 0;
            $categoryMonthly = [];

            for ($month = 1; $month <= 12; $month++) {
                $monthlyValue = (float)($record["m$month"] ?? 0);
                $categoryMonthly["m$month"] = $monthlyValue;
                $categoryTotal += $monthlyValue;

                if ($costType === 'operational') {
                    $operationalCosts[$month] += $monthlyValue;
                } else {
                    $directCosts[$month] += $monthlyValue;
                }
            }

            // Store category breakdown for detailed analysis
            $categoryBreakdown[] = [
                'category_id' => $categoryId,
                'category_name' => $categoryName,
                'cost_type' => $costType,
                'monthly_data' => $categoryMonthly,
                'total' => round($categoryTotal, 2)
            ];
        }

        // Rotate months based on financial year start month
        $rotate = function(array $months, int $startMonth): array {
            $values = array_values($months);
            return array_merge(
                array_slice($values, $startMonth - 1),
                array_slice($values, 0, $startMonth - 1)
            );
        };

        $directRotated = $rotate($directCosts, $startMonth);
        $operationalRotated = $rotate($operationalCosts, $startMonth);

        // Calculate quarterly totals
        $sumQuarter = function(array $months, int $startIndex): float {
            return array_sum(array_slice($months, $startIndex, 3));
        };

        $directQ1 = $sumQuarter($directRotated, 0);
        $directQ2 = $sumQuarter($directRotated, 3);
        $directQ3 = $sumQuarter($directRotated, 6);
        $directQ4 = $sumQuarter($directRotated, 9);
        $directTotal = array_sum($directRotated);

        $operationalQ1 = $sumQuarter($operationalRotated, 0);
        $operationalQ2 = $sumQuarter($operationalRotated, 3);
        $operationalQ3 = $sumQuarter($operationalRotated, 6);
        $operationalQ4 = $sumQuarter($operationalRotated, 9);
        $operationalTotal = array_sum($operationalRotated);

        // Calculate combined totals
        $totalQ1 = $directQ1 + $operationalQ1;
        $totalQ2 = $directQ2 + $operationalQ2;
        $totalQ3 = $directQ3 + $operationalQ3;
        $totalQ4 = $directQ4 + $operationalQ4;
        $totalCosts = $directTotal + $operationalTotal;

        return [
            'financial_year_id' => $financialYearId,
            'financial_year_name' => $financialYearName,
            'fy_start_year' => (int)$firstRecord['fy_start_year'],
            'fy_end_year' => (int)$firstRecord['fy_end_year'],
            'start_month' => $startMonth,
            'direct_q1' => round($directQ1, 2),
            'direct_q2' => round($directQ2, 2),
            'direct_q3' => round($directQ3, 2),
            'direct_q4' => round($directQ4, 2),
            'direct_total' => round($directTotal, 2),
            'operational_q1' => round($operationalQ1, 2),
            'operational_q2' => round($operationalQ2, 2),
            'operational_q3' => round($operationalQ3, 2),
            'operational_q4' => round($operationalQ4, 2),
            'operational_total' => round($operationalTotal, 2),
            'total_costs_q1' => round($totalQ1, 2),
            'total_costs_q2' => round($totalQ2, 2),
            'total_costs_q3' => round($totalQ3, 2),
            'total_costs_q4' => round($totalQ4, 2),
            'total_costs' => round($totalCosts, 2),
            'category_breakdown' => $categoryBreakdown,
            'quarter_details' => [
                'q1_months' => $this->getQuarterMonthNames($startMonth, 0),
                'q2_months' => $this->getQuarterMonthNames($startMonth, 3),
                'q3_months' => $this->getQuarterMonthNames($startMonth, 6),
                'q4_months' => $this->getQuarterMonthNames($startMonth, 9)
            ]
        ];
    }

    /**
     * Get quarterly costs for all years of a company.
     */
    public function getQuarterlyCostsAllYears(int $companyId): array
    {
        // Get all financial years that have costing data for this company
        $sql = "SELECT DISTINCT financial_year_id
                FROM company_costing_yearly_stats
                WHERE company_id = :company_id
                ORDER BY financial_year_id DESC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([':company_id' => $companyId]);
        $years = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $result = [];
        foreach ($years as $year) {
            $result[] = $this->getQuarterlyCosts($companyId, (int)$year);
        }

        return $result;
    }

    /**
     * Get quarterly costs by category for detailed breakdown.
     * Groups quarterly totals by category for charting and analysis.
     */
    public function getQuarterlyCostsByCategory(int $companyId, int $financialYearId): array
    {
        $quarterlyData = $this->getQuarterlyCosts($companyId, $financialYearId);

        if (empty($quarterlyData['category_breakdown'])) {
            return [];
        }

        $startMonth = $quarterlyData['start_month'];

        // Process each category to calculate quarterly values
        $categoryQuarterly = [];
        foreach ($quarterlyData['category_breakdown'] as $category) {
            $monthly = $category['monthly_data'];

            // Convert monthly data to array for rotation
            $monthlyArray = [];
            for ($i = 1; $i <= 12; $i++) {
                $monthlyArray[$i] = (float)($monthly["m$i"] ?? 0);
            }

            // Rotate based on financial year start month
            $values = array_values($monthlyArray);
            $rotated = array_merge(
                array_slice($values, $startMonth - 1),
                array_slice($values, 0, $startMonth - 1)
            );

            // Calculate quarterly totals
            $q1 = array_sum(array_slice($rotated, 0, 3));
            $q2 = array_sum(array_slice($rotated, 3, 3));
            $q3 = array_sum(array_slice($rotated, 6, 3));
            $q4 = array_sum(array_slice($rotated, 9, 3));

            $categoryQuarterly[] = [
                'category_id' => $category['category_id'],
                'category_name' => $category['category_name'],
                'cost_type' => $category['cost_type'],
                'q1' => round($q1, 2),
                'q2' => round($q2, 2),
                'q3' => round($q3, 2),
                'q4' => round($q4, 2),
                'total' => round($category['total'], 2)
            ];
        }

        return [
            'financial_year_id' => $quarterlyData['financial_year_id'],
            'financial_year_name' => $quarterlyData['financial_year_name'],
            'categories' => $categoryQuarterly
        ];
    }

    /**
     * Get month names for a quarter based on financial year start month.
     */
    private function getQuarterMonthNames(int $startMonth, int $quarterOffset): array
    {
        $monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        $result = [];
        for ($i = 0; $i < 3; $i++) {
            $monthIndex = ($startMonth + $quarterOffset + $i - 1) % 12;
            $result[] = $monthNames[$monthIndex];
        }

        return $result;
    }
}
