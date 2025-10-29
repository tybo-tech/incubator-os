<?php
include_once '../../config/Database.php';
include_once '../../models/CostCategories.php';

try {
    $database = new Database();
    $db = $database->connect();
    $costCategories = new CostCategories($db);

    // Get query parameters
    $filters = [];
    if (isset($_GET['parent_id'])) {
        $filters['parent_id'] = $_GET['parent_id'];
    }
    if (isset($_GET['industry_id'])) {
        $filters['industry_id'] = $_GET['industry_id'];
    }
    if (isset($_GET['search'])) {
        $filters['search'] = $_GET['search'];
    }

    $result = $costCategories->listCostCategories($filters);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>