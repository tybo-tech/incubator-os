<?php
include_once '../../config/Database.php';
include_once '../../models/Categories.php';
include_once '../../config/headers.php';

$metric_type_id = $_GET['metric_type_id'] ?? null;

if (!$metric_type_id) {
    http_response_code(400);
    echo json_encode(['error' => 'metric_type_id is required']);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $categories = new Categories($db);

    // Get categories associated with a specific metric type
    $result = $categories->getMetricTypeCategories((int)$metric_type_id);
    
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>