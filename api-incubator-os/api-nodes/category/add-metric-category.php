<?php
include_once '../../config/Database.php';
include_once '../../models/Categories.php';
include_once '../../config/headers.php';

$data = json_decode(file_get_contents("php://input"), true);

try {
    $database = new Database();
    $db = $database->connect();
    $categories = new Categories($db);

    // Create metric category with default values
    $result = $categories->addCategory(
        $data['name'],
        'metric', // Force type to be 'metric'
        null, // parent_id - metric categories are typically top-level
        $data['description'] ?? '',
        null, // image_url - not needed for metric categories
        $data['depth'] ?? 1 // depth - metric categories are typically depth 1
    );
    
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>