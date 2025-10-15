<?php
include_once '../../config/Database.php';
include_once '../../models/FinancialYears.php';
include_once '../../config/headers.php';

// Get ID from query parameter
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'Financial year ID is required']);
    exit;
}

// Read JSON input
$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON data']);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $financialYears = new FinancialYears($db);

    $result = $financialYears->update($id, $data);
    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
