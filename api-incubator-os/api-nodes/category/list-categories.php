<?php
include_once '../../config/Database.php';
include_once '../../models/Categories.php';
include_once '../../config/headers.php';

$type = $_GET['type'] ?? null;
$parent_id = $_GET['parent_id'] ?? null;
$depth = $_GET['depth'] ?? null;

$filters = [];
if ($type) $filters['type'] = $type;
if ($parent_id !== null) $filters['parent_id'] = (int)$parent_id;
if ($depth) $filters['depth'] = (int)$depth;

try {
    $database = new Database();
    $db = $database->connect();
    $categories = new Categories($db);

    $result = $categories->listCategories($filters);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
