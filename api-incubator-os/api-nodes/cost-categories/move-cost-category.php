<?php
include_once '../../config/Database.php';
include_once '../../models/CostCategories.php';

$data = json_decode(file_get_contents("php://input"), true);

try {
    $database = new Database();
    $db = $database->connect();
    $costCategories = new CostCategories($db);

    $categoryId = $data['category_id'] ?? null;
    $newParentId = $data['new_parent_id'] ?? null;

    if (!$categoryId) {
        http_response_code(400);
        echo json_encode(['error' => 'Category ID is required']);
        exit;
    }

    $result = $costCategories->moveCostCategory((int)$categoryId, $newParentId);
    if (!$result) {
        http_response_code(404);
        echo json_encode(['error' => 'Cost category not found']);
        exit;
    }

    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>