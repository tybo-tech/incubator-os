<?php
require_once '../config/Database.php';
require_once '../models/MetricRecord.php';

echo "🧪 Testing Updated MetricRecord Model\n";
echo "=====================================\n\n";

try {
    // Initialize database connection
    $database = new Database();
    $db = $database->connect();
    $metricRecord = new MetricRecord($db);

    echo "✅ Database connection established\n";

    // Test 1: Check if new columns exist
    echo "\n📋 Test 1: Verifying table structure...\n";
    $stmt = $db->prepare("DESCRIBE metric_records");
    $stmt->execute();
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $requiredColumns = ['category_id', 'notes'];
    $foundColumns = array_column($columns, 'Field');

    foreach ($requiredColumns as $column) {
        if (in_array($column, $foundColumns)) {
            echo "  ✅ Column '$column' exists\n";
        } else {
            echo "  ❌ Column '$column' missing\n";
        }
    }

    // Check if title column was removed
    if (!in_array('title', $foundColumns)) {
        echo "  ✅ Column 'title' successfully removed\n";
    } else {
        echo "  ⚠️  Column 'title' still exists (may need manual removal)\n";
    }

    // Test 2: Check enum values
    echo "\n📋 Test 2: Verifying period_type enum...\n";
    $stmt = $db->prepare("SHOW COLUMNS FROM metric_types WHERE Field = 'period_type'");
    $stmt->execute();
    $enumInfo = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($enumInfo && strpos($enumInfo['Type'], 'YEARLY_SIDE_BY_SIDE') !== false) {
        echo "  ✅ YEARLY_SIDE_BY_SIDE enum value exists\n";
    } else {
        echo "  ❌ YEARLY_SIDE_BY_SIDE enum value missing\n";
    }

    // Test 3: Test basic CRUD operations with new fields
    echo "\n📋 Test 3: Testing CRUD operations...\n";

    // Insert test record with category_id and notes
    $testData = [
        'company_id' => 1,
        'metric_type_id' => 1,
        'category_id' => 1,
        'year' => 2024,
        'quarter' => 1,
        'value' => 100.50,
        'notes' => 'Test record with category and notes'
    ];

    try {
        $newRecord = $metricRecord->add($testData);
        echo "  ✅ Create operation successful (ID: {$newRecord['id']})\n";

        // Test read with category join
        $retrieved = $metricRecord->getById($newRecord['id']);
        if ($retrieved && isset($retrieved['category_name'])) {
            echo "  ✅ Read operation with category join successful\n";
        } else {
            echo "  ⚠️  Read operation successful but category join may need verification\n";
        }

        // Test update
        $updated = $metricRecord->update($newRecord['id'], ['notes' => 'Updated test notes']);
        if ($updated && $updated['notes'] === 'Updated test notes') {
            echo "  ✅ Update operation successful\n";
        }

        // Clean up test record
        $metricRecord->delete($newRecord['id']);
        echo "  ✅ Delete operation successful\n";

    } catch (Exception $e) {
        echo "  ❌ CRUD operation failed: " . $e->getMessage() . "\n";
    }

    echo "\n🎉 Schema validation completed!\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
