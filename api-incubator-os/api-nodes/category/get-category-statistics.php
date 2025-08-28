<?php
include_once '../../config/Database.php';
include_once '../../models/Categories.php';
include_once '../../config/headers.php';

$categoryId = (int)($_GET['category_id'] ?? 0);

if (!$categoryId) {
    http_response_code(400);
    echo json_encode(['error' => 'category_id parameter is required']);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $categories = new Categories($db);

    // Use enhanced statistics method that leverages CategoryItem model
    $result = $categories->getCategoryStatistics($categoryId);
    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
