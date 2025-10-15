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

try {
    $database = new Database();
    $db = $database->connect();
    $financialYears = new FinancialYears($db);

    $result = $financialYears->setActive($id);
    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}