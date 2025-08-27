<?php
include_once '../../config/Database.php';
include_once '../../models/Categories.php';
include_once '../../config/headers.php';

$id = $_GET['id'] ?? null;

try {
    $database = new Database();
    $db = $database->connect();
    $categories = new Categories($db);

    if ($id) {
        $result = $categories->getCategoryById((int)$id);
        if ($result) {
            echo json_encode($result);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Category not found']);
        }
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'ID parameter required']);
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
