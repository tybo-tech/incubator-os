<?php
include_once '../../config/Database.php';
include_once '../../models/CompanyFinancials.php';

// Get POST data
$input = file_get_contents("php://input");
$data = json_decode($input, true);

// Debug logging
error_log("Raw input: " . $input);
error_log("Parsed data: " . print_r($data, true));
error_log("JSON last error: " . json_last_error_msg());

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

    $result = $fin->add($data);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
