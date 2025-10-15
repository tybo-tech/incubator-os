<?php
include_once '../../config/Database.php';
include_once '../../models/CompanyFinancialYearlyStats.php';
include_once '../../config/headers.php';

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Valid id is required']);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $yearlyStats = new CompanyFinancialYearlyStats($db);

    $result = $yearlyStats->getById($id);

    if (!$result) {
        http_response_code(404);
        echo json_encode(['error' => 'Yearly stats record not found']);
        exit;
    }

    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
