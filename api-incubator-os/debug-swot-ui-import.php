<?php
// Test script to debug the UI-aligned SWOT import
require_once 'config/database.php';
require_once 'models/SwotImport.php';

try {
    $database = new Database();
    $db = $database->connect();
    $swotImport = new SwotImport($db);

    $companyId = 11;

    echo "=== DEBUGGING UI-ALIGNED SWOT IMPORT ===\n";
    echo "Company ID: {$companyId}\n\n";

    // 1. Check existing first node
    $stmt = $db->prepare("
        SELECT id, data FROM nodes
        WHERE company_id = ? AND type = 'swot_analysis'
        ORDER BY created_at ASC
        LIMIT 1
    ");
    $stmt->execute([$companyId]);
    $existingNode = $stmt->fetch(PDO::FETCH_ASSOC);

    echo "1. EXISTING FIRST NODE:\n";
    echo "Node ID: " . ($existingNode['id'] ?? 'None') . "\n";
    if ($existingNode) {
        $existingData = json_decode($existingNode['data'], true);
        echo "Existing strengths: " . count($existingData['internal']['strengths'] ?? []) . "\n";
        echo "Existing weaknesses: " . count($existingData['internal']['weaknesses'] ?? []) . "\n";
        echo "Existing opportunities: " . count($existingData['external']['opportunities'] ?? []) . "\n";
        echo "Existing threats: " . count($existingData['external']['threats'] ?? []) . "\n";
    }

    // 2. Check what SWOT items are available to import
    echo "\n2. AVAILABLE SWOT ITEMS TO IMPORT:\n";
    $allSwotNodes = $swotImport->getAllSwotNodes();
    $companyNodes = array_filter($allSwotNodes, function($node) use ($companyId) {
        return (int)$node['company_id'] === $companyId;
    });

    echo "SWOT nodes for company {$companyId}: " . count($companyNodes) . "\n";

    foreach ($companyNodes as $i => $node) {
        echo "Node {$i}: ID=" . $node['id'] . "\n";
        $items = $swotImport->extractSwotItems($node);
        echo "  Items extracted: " . count($items) . "\n";

        foreach ($items as $j => $item) {
            if ($j < 3) { // Show first 3 items
                echo "    - {$item['category']}: " . substr($item['description'], 0, 50) . "...\n";
            }
        }
    }

    // 3. Test the import
    echo "\n3. RUNNING IMPORT:\n";
    $result = $swotImport->importSwotToUINode($companyId);
    echo "Import result: " . json_encode($result, JSON_PRETTY_PRINT) . "\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}
?>
