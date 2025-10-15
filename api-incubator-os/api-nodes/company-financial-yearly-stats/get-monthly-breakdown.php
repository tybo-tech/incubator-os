<?php
include_once '../../config/Database.php';
include_once '../../models/CompanyFinancialYearlyStats.php';
include_once '../../config/headers.php';

$companyId = isset($_GET['company_id']) ? (int)$_GET['company_id'] : 0;
$financialYearId = isset($_GET['financial_year_id']) ? (int)$_GET['financial_year_id'] : 0;

if ($companyId <= 0 || $financialYearId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Valid company_id and financial_year_id are required']);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $yearlyStats = new CompanyFinancialYearlyStats($db);
    
    $result = $yearlyStats->getMonthlyBreakdown($companyId, $financialYearId);
    echo json_encode($result);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}