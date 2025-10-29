<?php
include_once '../../config/Database.php';
include_once '../../models/CostCategories.php';

try {
    $database = new Database();
    $db = $database->connect();
    $costCategories = new CostCategories($db);

    $search = $_GET['search'] ?? null;
    $industryId = $_GET['industry_id'] ?? null;

    if (!$search) {
        http_response_code(400);
        echo json_encode(['error' => 'Search term is required']);
        exit;
    }

    $industryIdFilter = $industryId ? (int)$industryId : null;
    $result = $costCategories->searchCostCategories($search, $industryIdFilter);
    
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>