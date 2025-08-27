<?php
include_once '../../config/Database.php';
include_once '../../models/Categories.php';
include_once '../../config/headers.php';

$category_id = $_GET['category_id'] ?? null;

try {
    $database = new Database();
    $db = $database->connect();
    $categories = new Categories($db);

    if ($category_id) {
        $result = $categories->breadcrumb((int)$category_id);
        echo json_encode($result);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'category_id parameter required']);
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
