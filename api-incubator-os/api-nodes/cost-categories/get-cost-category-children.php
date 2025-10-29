<?php
include_once '../../config/Database.php';
include_once '../../models/CostCategories.php';

try {
    $database = new Database();
    $db = $database->connect();
    $costCategories = new CostCategories($db);

    $parentId = $_GET['parent_id'] ?? null;
    if (!$parentId) {
        http_response_code(400);
        echo json_encode(['error' => 'Parent ID is required']);
        exit;
    }

    $result = $costCategories->getCostCategoryChildren((int)$parentId);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>