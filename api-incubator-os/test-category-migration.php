<?php
// Test script to verify the metadata to categories migration is working

include_once 'config/Database.php';
include_once 'models/MetricType.php';
include_once 'models/Metrics.php';

try {
    $database = new Database();
    $db = $database->connect();

    $metricType = new MetricType($db);
    $metrics = new Metrics($db);

    echo "=== Testing Metric Type with Categories ===\n";

    // Test 1: Get a metric type by ID (should now include categories)
    echo "\n1. Testing getById with categories...\n";
    $type = $metricType->getById(10); // Assuming ID 10 exists
    if ($type) {
        echo "Metric Type: " . $type['name'] . "\n";
        echo "Categories count: " . count($type['categories']) . "\n";
        if (!empty($type['categories'])) {
            echo "Categories:\n";
            foreach ($type['categories'] as $cat) {
                echo "  - " . $cat['name'] . " (ID: " . $cat['id'] . ")\n";
            }
        } else {
            echo "No categories found for this metric type.\n";
        }
    } else {
        echo "Metric type with ID 10 not found.\n";
    }

    // Test 2: Get types with categories
    echo "\n2. Testing getTypesWithCategories...\n";
    $typesWithCategories = $metricType->getTypesWithCategories();
    echo "Found " . count($typesWithCategories) . " metric types with categories.\n";

    // Test 3: Test the Metrics model getFullMetrics
    echo "\n3. Testing Metrics getFullMetrics (first group only)...\n";
    $fullMetrics = $metrics->getFullMetrics(1, 1, 1, 1); // Using sample IDs
    if (!empty($fullMetrics)) {
        $firstGroup = $fullMetrics[0];
        echo "Group: " . $firstGroup['name'] . "\n";
        if (!empty($firstGroup['types'])) {
            $firstType = $firstGroup['types'][0];
            echo "  Type: " . $firstType['name'] . "\n";
            echo "  Categories count: " . count($firstType['categories'] ?? []) . "\n";
        }
    }

    // Test 4: Test category management
    echo "\n4. Testing category management...\n";
    $categories = $metrics->getTypeCategories(10); // Assuming ID 10 exists
    echo "Found " . count($categories) . " categories for metric type ID 10.\n";

    echo "\n=== All tests completed successfully! ===\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}
?>
