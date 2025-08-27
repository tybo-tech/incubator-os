<?php
include_once '../../config/Database.php';
include_once '../../models/Categories.php';
include_once '../../config/headers.php';

$data = json_decode(file_get_contents("php://input"), true);

try {
    $database = new Database();
    $db = $database->connect();
    $categories = new Categories($db);

    $result = $categories->addCategory(
        $data['name'],
        $data['type'],
        $data['parent_id'] ?? null,
        $data['description'] ?? null,
        $data['image_url'] ?? null
    );
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
