<?php
include_once '../../config/Database.php';
include_once '../../models/CompanyFinancials.php';

// Get POST data
$input = file_get_contents("php://input");
$data = json_decode($input, true);


// Validate input
if ($data === null) {
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
    echo json_encode(['error' => $e->getMessage()]);
}
