<?php
include_once '../../config/Database.php';
include_once '../../models/CompanyCostingYearlyStats.php';

try {
    $database = new Database();
    $db = $database->connect();
    $costingStats = new CompanyCostingYearlyStats($db);

    $companyId = $_GET['company_id'] ?? null;
    $financialYearId = $_GET['financial_year_id'] ?? null;

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

    $deletedCount = $costingStats->deleteCompanyCostingByYear((int)$companyId, (int)$financialYearId);
    
    echo json_encode([
        'success' => true,
        'message' => "Deleted $deletedCount costing records for company and year",
        'deleted_count' => $deletedCount
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>