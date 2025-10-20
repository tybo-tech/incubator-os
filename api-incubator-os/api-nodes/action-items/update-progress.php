<?php
include_once '../../config/Database.php';
include_once '../../models/ActionItems.php';
include_once '../../config/headers.php';

// Get ID from query parameter
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;
$progress = isset($_GET['progress']) ? (int)$_GET['progress'] : null;

if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'Action item ID is required']);
    exit;
}

if ($progress === null) {
    http_response_code(400);
    echo json_encode(['error' => 'Progress value is required']);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $actionItems = new ActionItems($db);

    $result = $actionItems->updateProgress($id, $progress);
    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
