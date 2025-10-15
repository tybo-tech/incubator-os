<?php
include_once '../../config/Database.php';
include_once '../../models/CompanyFinancialYearlyStats.php';
include_once '../../config/headers.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !isset($data['company_id']) || !isset($data['financial_year_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'company_id and financial_year_id are required']);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $yearlyStats = new CompanyFinancialYearlyStats($db);
    
    $result = $yearlyStats->add($data);
    echo json_encode($result);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}