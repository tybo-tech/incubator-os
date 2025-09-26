<?php
include_once '../../config/Database.php';
include_once '../../models/Categories.php';
include_once '../../config/headers.php';

try {
    $database = new Database();
    $db = $database->connect();
    $categories = new Categories($db);

    // Get categories specifically for metrics using the convenience method
    $result = $categories->listMetricCategories();

    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
