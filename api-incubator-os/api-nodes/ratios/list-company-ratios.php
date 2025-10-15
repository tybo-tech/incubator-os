<?php
include_once '../../config/Database.php';
include_once '../../models/FinancialRatios.php';
include_once '../../config/headers.php';

$companyId = isset($_GET['company_id']) ? (int)$_GET['company_id'] : 0;
$year = isset($_GET['year']) ? (int)$_GET['year'] : null;

if ($companyId <= 0 || !$year) {
    http_response_code(400);
    echo json_encode(['error' => 'Valid company_id and year are required']);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $ratios = new FinancialRatios($db);
    $result = $ratios->listByCompanyAndYear($companyId, $year);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
