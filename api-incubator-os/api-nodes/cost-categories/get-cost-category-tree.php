<?php
include_once '../../config/Database.php';
include_once '../../models/CostCategories.php';

try {
    $database = new Database();
    $db = $database->connect();
    $costCategories = new CostCategories($db);

    $industryId = $_GET['industry_id'] ?? null;
    $industryIdFilter = $industryId ? (int)$industryId : null;

    $result = $costCategories->getCostCategoryTree($industryIdFilter);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>