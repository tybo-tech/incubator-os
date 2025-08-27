<?php
include_once '../../config/Database.php';
include_once '../../models/Categories.php';
include_once '../../config/headers.php';

$parent_id = $_GET['parent_id'] ?? null;
$type = $_GET['type'] ?? null;

try {
    $database = new Database();
    $db = $database->connect();
    $categories = new Categories($db);

    if ($parent_id) {
        $result = $categories->listChildren((int)$parent_id, $type);
        echo json_encode($result);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'parent_id parameter required']);
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
