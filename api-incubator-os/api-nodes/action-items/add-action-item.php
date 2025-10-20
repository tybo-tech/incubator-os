<?php
include_once '../../config/Database.php';
include_once '../../models/ActionItems.php';
include_once '../../config/headers.php';

// Read JSON input
$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON data']);
    exit;
}

// Validate required fields
$requiredFields = ['company_id', 'context_type', 'category', 'description'];
foreach ($requiredFields as $field) {
    if (!isset($data[$field]) || empty($data[$field])) {
        http_response_code(400);
        echo json_encode(['error' => "Field '$field' is required"]);
        exit;
    }
}

// Validate context_type enum
if (!in_array($data['context_type'], ['swot', 'gps'])) {
    http_response_code(400);
    echo json_encode(['error' => 'context_type must be either "swot" or "gps"']);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $actionItems = new ActionItems($db);

    $result = $actionItems->add($data);
    http_response_code(201);
    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}