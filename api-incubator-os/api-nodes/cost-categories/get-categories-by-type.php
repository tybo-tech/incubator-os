<?php
include_once '../../config/Database.php';
include_once '../../models/CostCategories.php';

try {
    $database = new Database();
    $db = $database->connect();
    $costCategories = new CostCategories($db);

    $costType = $_GET['cost_type'] ?? null;

    if (!$costType || !in_array($costType, ['direct', 'operational'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Valid cost_type (direct or operational) is required']);
        exit;
    }

    $result = $costCategories->getCostCategoriesByType($costType);
    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>