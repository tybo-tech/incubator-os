<?php
include_once '../../config/Database.php';
include_once '../../models/FinancialYears.php';
include_once '../../config/headers.php';

// Read JSON input
$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON data']);
    exit;
}

// Validate required fields
$requiredFields = ['name', 'start_month', 'end_month', 'fy_start_year', 'fy_end_year'];
foreach ($requiredFields as $field) {
    if (!isset($data[$field]) || empty($data[$field])) {
        http_response_code(400);
        echo json_encode(['error' => "Field '$field' is required"]);
        exit;
    }
}

try {
    $database = new Database();
    $db = $database->connect();
    $financialYears = new FinancialYears($db);

    $result = $financialYears->add($data);
    http_response_code(201);
    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}