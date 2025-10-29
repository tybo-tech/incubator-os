<?php
include_once '../../config/Database.php';
include_once '../../models/CompanyCostingYearlyStats.php';

try {
    $database = new Database();
    $db = $database->connect();
    $costingStats = new CompanyCostingYearlyStats($db);

    $companyId = $_GET['company_id'] ?? null;
    $financialYearId = $_GET['financial_year_id'] ?? null;
    $costType = $_GET['cost_type'] ?? null;

    if (!$companyId) {
        http_response_code(400);
        echo json_encode(['error' => 'Company ID is required']);
        exit;
    }

    if (!$financialYearId) {
        http_response_code(400);
        echo json_encode(['error' => 'Financial Year ID is required']);
        exit;
    }

    $result = $costingStats->getCompanyCostingByYear((int)$companyId, (int)$financialYearId, $costType);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>