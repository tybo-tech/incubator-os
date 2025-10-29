<?php
include_once '../../config/Database.php';
include_once '../../models/CostCategories.php';

try {
    $database = new Database();
    $db = $database->connect();
    $costCategories = new CostCategories($db);

    $id = $_GET['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'Cost category ID is required']);
        exit;
    }

    $result = $costCategories->deleteCostCategory((int)$id);
    if (!$result) {
        http_response_code(404);
        echo json_encode(['error' => 'Cost category not found or could not be deleted']);
        exit;
    }

    echo json_encode(['success' => true, 'message' => 'Cost category deleted successfully']);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>