<?php
// Quick test script to verify ratio calculations
// Run this from the api-incubator-os directory: php test_ratios_direct.php

require_once 'config/Database.php';
require_once 'models/MetricType.php';
require_once 'services/RatioCalculatorService.php';

try {
    echo "=== Ratio Calculation Test ===\n\n";

    // Connect to database
    $database = new Database();
    $db = $database->connect();
    $ratioService = new RatioCalculatorService($db);

    // Test parameters (based on your metric_records data)
    $clientId = 1;
    $companyId = 11;
    $programId = 2;
    $cohortId = 3;
    $year = 2025;

    echo "Testing ratios for:\n";
    echo "- Client ID: $clientId\n";
    echo "- Company ID: $companyId\n";
    echo "- Program ID: $programId\n";
    echo "- Cohort ID: $cohortId\n";
    echo "- Year: $year\n\n";

    // Get ratios
    $ratios = $ratioService->getRatiosByYear($clientId, $companyId, $programId, $cohortId, $year);

    if (empty($ratios)) {
        echo "❌ No ratios calculated. Possible issues:\n";
        echo "1. No ratio metric types with formula_metadata\n";
        echo "2. Missing metric records for the specified year\n";
        echo "3. Variable names in formulas don't match metric codes\n\n";

        // Debug: Show available metric types with formulas
        $stmt = $db->prepare("SELECT code, name, formula_metadata FROM metric_types WHERE group_id = 6 AND formula_metadata IS NOT NULL");
        $stmt->execute();
        $ratioTypes = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo "Available ratio types:\n";
        foreach ($ratioTypes as $type) {
            echo "- {$type['code']}: {$type['name']}\n";
            echo "  Formula: " . $type['formula_metadata'] . "\n";
        }
        echo "\n";

        // Debug: Show available metric records
        $stmt = $db->prepare("
            SELECT mt.code, mt.name, mr.total
            FROM metric_records mr
            JOIN metric_types mt ON mr.metric_type_id = mt.id
            WHERE mr.company_id = ? AND mr.year_ = ?
            ORDER BY mt.code
        ");
        $stmt->execute([$companyId, $year]);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo "Available metric records for year $year:\n";
        foreach ($records as $record) {
            echo "- {$record['code']}: {$record['total']}\n";
        }

    } else {
        echo "✅ Successfully calculated " . count($ratios) . " ratios:\n\n";

        foreach ($ratios as $ratio) {
            echo "📊 {$ratio['name']} ({$ratio['code']})\n";
            echo "   Formula: {$ratio['formula']}\n";
            echo "   Value: {$ratio['calculated_value']} {$ratio['unit']}\n";
            echo "   Targets: Min={$ratio['min_target']}, Ideal={$ratio['ideal_target']}\n";
            echo "   Status: {$ratio['status']}\n";
            echo "   Variables used:\n";
            foreach ($ratio['variable_values'] as $var => $val) {
                echo "     - $var: " . number_format($val, 2) . "\n";
            }
            echo "\n";
        }
    }

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
