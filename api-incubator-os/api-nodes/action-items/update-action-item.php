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

// Read JSON input
$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON data']);
    exit;
}

// Validate context_type enum if provided
if (isset($data['context_type']) && !in_array($data['context_type'], ['swot', 'gps'])) {
    http_response_code(400);
    echo json_encode(['error' => 'context_type must be either "swot" or "gps"']);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $actionItems = new ActionItems($db);

    $result = $actionItems->update($id, $data);
    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
