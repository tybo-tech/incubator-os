<?php
include_once '../../config/Database.php';
include_once '../../models/CompanyCostingYearlyStats.php';

try {
    $database = new Database();
    $db = $database->connect();
    $costingStats = new CompanyCostingYearlyStats($db);

    $companyId = $_GET['company_id'] ?? null;
    $financialYearIds = $_GET['financial_year_ids'] ?? null;

    if (!$companyId) {
        http_response_code(400);
        echo json_encode(['error' => 'Company ID is required']);
        exit;
    }

    if (!$financialYearIds) {
        http_response_code(400);
        echo json_encode(['error' => 'Financial Year IDs are required']);
        exit;
    }

    // Convert comma-separated string to array of integers
    $yearIds = array_map('intval', explode(',', $financialYearIds));

    $result = $costingStats->getCompanyCostingComparison((int)$companyId, $yearIds);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>