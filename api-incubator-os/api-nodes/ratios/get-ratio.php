<?php
include_once '../../config/Database.php';
include_once '../../models/FinancialRatios.php';
include_once '../../config/headers.php';

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Valid ratio id is required']);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $ratios = new FinancialRatios($db);
    $result = $ratios->getById($id);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
