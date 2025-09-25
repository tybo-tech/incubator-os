<?php
include_once '../../config/Database.php';
include_once '../../models/Categories.php';
include_once '../../config/headers.php';

$input = json_decode(file_get_contents('php://input'), true);
$metric_type_id = $input['metric_type_id'] ?? null;
$category_ids = $input['category_ids'] ?? [];

if (!$metric_type_id) {
    http_response_code(400);
    echo json_encode(['error' => 'metric_type_id is required']);
    exit;
}

if (!is_array($category_ids)) {
    http_response_code(400);
    echo json_encode(['error' => 'category_ids must be an array']);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $categories = new Categories($db);

    $success = $categories->updateMetricTypeCategories((int)$metric_type_id, $category_ids);

    echo json_encode(['success' => $success]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
