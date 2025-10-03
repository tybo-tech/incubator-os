<?php
include_once '../../config/Database.php';
include_once '../../models/CompanyFinancials.php';

// Get POST data
$input = file_get_contents("php://input");
$data = json_decode($input, true);

// Validate input
if ($data === null) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Invalid JSON data received',
        'raw_input' => $input,
        'json_error' => json_last_error_msg()
    ]);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $fin = new CompanyFinancials($db);

    $id = $data['id'] ?? null;
    if (!$id) throw new Exception('id is required');
    $result = $fin->delete((int)$id);
    echo json_encode(['success' => $result]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
