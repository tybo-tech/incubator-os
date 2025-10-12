<?php
include_once '../../config/Database.php';
include_once '../../models/FinancialCategories.php';

// Support single item_type (backward compatibility)
$itemType = isset($_GET['item_type']) ? $_GET['item_type'] : null;

// Support multiple item types for flexible filtering
$itemType1 = isset($_GET['item_type1']) ? $_GET['item_type1'] : null;
$itemType2 = isset($_GET['item_type2']) ? $_GET['item_type2'] : null;

$onlyActive = isset($_GET['only_active']) ? (bool)$_GET['only_active'] : false;

try {
    $database = new Database();
    $db = $database->connect();
    $category = new FinancialCategories($db);

    // Determine which method to use based on parameters
    if ($itemType1 || $itemType2) {
        // Use multi-type filtering
        $result = $category->listByMultipleTypes($itemType1, $itemType2, $onlyActive);
    } else {
        // Use single type filtering (backward compatibility)
        $result = $category->listAll($itemType, $onlyActive);
    }

    echo json_encode($result);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
