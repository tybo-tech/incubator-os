<?php
include_once '../../config/Database.php';
include_once '../../models/CostCategories.php';

$data = json_decode(file_get_contents("php://input"), true);

try {
    $database = new Database();
    $db = $database->connect();
    $costCategories = new CostCategories($db);

    $result = $costCategories->addCostCategory(
        $data['name'],
        $data['parent_id'] ?? null,
        $data['industry_id'] ?? null
    );
    
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>