<?php
include_once '../../config/Database.php';
include_once '../../models/ActionItems.php';
include_once '../../config/headers.php';

// Get ID from query parameter
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'Action item ID is required']);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $actionItems = new ActionItems($db);

    $success = $actionItems->delete($id);

    if ($success) {
        echo json_encode(['message' => 'Action item deleted successfully']);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Action item not found']);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
