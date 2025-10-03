<?php
declare(strict_types=1);

class RatioCalculatorService
{
    private PDO $conn;
    private MetricType $metricTypeModel;

    public function __construct(PDO $db)
    {
        $this->conn = $db;
        $this->metricTypeModel = new MetricType($db);
    }

    /**
     * Get all calculated ratios for a specific company and year
     */
    public function getRatiosByYear(int $clientId, int $companyId, int $programId, int $cohortId, int $year): array
    {
        // Step 1: Get all ratio metric types (group_id = 6 for ratios)
        $stmt = $this->conn->prepare("SELECT * FROM metric_types WHERE group_id = 6 AND formula_metadata IS NOT NULL");
        $stmt->execute();
        $ratioTypes = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($ratioTypes)) {
            return [];
        }

        // Step 2: Fetch all metric records for the specified year and company
        $metricRecords = $this->getMetricRecordsByYear($clientId, $companyId, $programId, $cohortId, $year);

        // Step 3: Create a lookup map for metric codes to values
        $metricValues = $this->buildMetricValueLookup($metricRecords);

        // Step 4: Calculate each ratio
        $results = [];
        foreach ($ratioTypes as $ratioType) {
            $ratio = $this->calculateRatio($ratioType, $metricValues);
            if ($ratio) {
                $results[] = $ratio;
            }
        }

        return $results;
    }

    /**
     * Get metric records for a specific year and company
     */
    private function getMetricRecordsByYear(int $clientId, int $companyId, int $programId, int $cohortId, int $year): array
    {
        $stmt = $this->conn->prepare("
            SELECT
                mt.code,
                mt.name,
                mr.total,
                mr.q1,
                mr.q2,
                mr.q3,
                mr.q4,
                mr.margin_pct,
                mr.unit
            FROM metric_records mr
            JOIN metric_types mt ON mr.metric_type_id = mt.id
            WHERE mr.client_id = ?
              AND mr.company_id = ?
              AND mr.program_id = ?
              AND mr.cohort_id = ?
              AND mr.year_ = ?
        ");

        $stmt->execute([$clientId, $companyId, $programId, $cohortId, $year]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Build a lookup map from metric codes to their values
     */
    private function buildMetricValueLookup(array $metricRecords): array
    {
        $lookup = [];
        foreach ($metricRecords as $record) {
            $lookup[$record['code']] = [
                'total' => (float)($record['total'] ?? 0),
                'q1' => (float)($record['q1'] ?? 0),
                'q2' => (float)($record['q2'] ?? 0),
                'q3' => (float)($record['q3'] ?? 0),
                'q4' => (float)($record['q4'] ?? 0),
                'margin_pct' => (float)($record['margin_pct'] ?? 0)
            ];
        }
        return $lookup;
    }

    /**
     * Calculate a single ratio based on its formula metadata
     */
    private function calculateRatio(array $ratioType, array $metricValues): ?array
    {
        $metadata = json_decode($ratioType['formula_metadata'], true);
        if (!$metadata || !isset($metadata['variables']) || !isset($metadata['formula'])) {
            return null;
        }

        $variables = $metadata['variables'];
        $formula = $metadata['formula'];

        // Get values for each variable
        $values = [];
        foreach ($variables as $varCode) {
            if (!isset($metricValues[$varCode])) {
                // If any required variable is missing, skip this ratio
                return null;
            }
            $values[$varCode] = $metricValues[$varCode]['total'];
        }

        // Calculate the ratio value
        $calculatedValue = $this->evaluateFormula($formula, $values);

        if ($calculatedValue === null) {
            return null;
        }

        // Determine status based on targets
        $status = $this->getTargetStatus($calculatedValue, $ratioType['min_target'], $ratioType['ideal_target']);

        return [
            'id' => (int)$ratioType['id'],
            'code' => $ratioType['code'],
            'name' => $ratioType['name'],
            'description' => $ratioType['description'],
            'formula' => $formula,
            'variables' => $variables,
            'variable_values' => $values,
            'calculated_value' => $calculatedValue,
            'min_target' => (float)($ratioType['min_target'] ?? 0),
            'ideal_target' => (float)($ratioType['ideal_target'] ?? 0),
            'unit' => $ratioType['unit'],
            'status' => $status,
            'display' => $metadata['display'] ?? ['unit' => $ratioType['unit'], 'decimals' => 2]
        ];
    }

    /**
     * Evaluate a formula string with variable substitution
     */
    private function evaluateFormula(string $formula, array $values): ?float
    {
        // Replace variable names with their values
        $expression = $formula;
        foreach ($values as $varCode => $value) {
            $expression = str_replace($varCode, (string)$value, $expression);
        }

        // Simple formula evaluation for basic arithmetic
        try {
            // Security check: only allow numbers, operators, parentheses, and decimal points
            if (!preg_match('/^[0-9+\-*\/\(\)\.\s]+$/', $expression)) {
                return null;
            }

            // Check for division by zero
            if (preg_match('/\/\s*0(?:\.|$|\s|\))/', $expression)) {
                return null;
            }

            // Evaluate the expression safely
            $result = eval("return $expression;");

            return is_numeric($result) ? (float)$result : null;
        } catch (Throwable $e) {
            error_log("Formula evaluation error: " . $e->getMessage() . " for expression: $expression");
            return null;
        }
    }

    /**
     * Determine status based on target comparison
     */
    private function getTargetStatus(float $value, ?float $minTarget, ?float $idealTarget): string
    {
        if ($idealTarget !== null && $value >= $idealTarget) {
            return 'excellent';
        }

        if ($minTarget !== null && $value >= $minTarget) {
            return 'good';
        }

        if ($minTarget !== null && $value < $minTarget) {
            return 'below_target';
        }

        return 'neutral';
    }

    /**
     * Get ratios grouped by category (e.g., Profitability, Liquidity, Solvency)
     */
    public function getRatiosGrouped(int $clientId, int $companyId, int $programId, int $cohortId, int $year): array
    {
        $ratios = $this->getRatiosByYear($clientId, $companyId, $programId, $cohortId, $year);

        $grouped = [
            'profitability' => [],
            'liquidity' => [],
            'solvency' => [],
            'efficiency' => [],
            'other' => []
        ];

        foreach ($ratios as $ratio) {
            $category = $this->categorizeRatio($ratio['code']);
            $grouped[$category][] = $ratio;
        }

        return $grouped;
    }

    /**
     * Categorize ratios by their type
     */
    private function categorizeRatio(string $code): string
    {
        $profitabilityRatios = ['RATIO_PROFIT_MARGIN', 'RATIO_GROSS_MARGIN', 'RATIO_OPERATING_MARGIN', 'RATIO_ROA', 'RATIO_ROE'];
        $liquidityRatios = ['RATIO_CURRENT', 'RATIO_QUICK'];
        $solvencyRatios = ['RATIO_DEBT_EQUITY'];
        $efficiencyRatios = ['RATIO_ASSET_TURNOVER'];

        if (in_array($code, $profitabilityRatios)) {
            return 'profitability';
        }

        if (in_array($code, $liquidityRatios)) {
            return 'liquidity';
        }

        if (in_array($code, $solvencyRatios)) {
            return 'solvency';
        }

        if (in_array($code, $efficiencyRatios)) {
            return 'efficiency';
        }

        return 'other';
    }

    /**
     * Update targets for a ratio
     */
    public function updateRatioTargets(int $ratioId, ?float $minTarget, ?float $idealTarget): bool
    {
        $stmt = $this->conn->prepare("UPDATE metric_types SET min_target = ?, ideal_target = ? WHERE id = ?");
        return $stmt->execute([$minTarget, $idealTarget, $ratioId]);
    }
}
