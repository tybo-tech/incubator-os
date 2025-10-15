<?php
include_once '../../config/Database.php';
include_once '../../models/CompanyFinancialYearlyStats.php';
include_once '../../config/headers.php';

// Parse query parameters and filters
$companyId = isset($_GET['company_id']) ? (int)$_GET['company_id'] : null;
$financialYearId = isset($_GET['financial_year_id']) ? (int)$_GET['financial_year_id'] : null;
$isRevenue = isset($_GET['is_revenue']) ? (bool)$_GET['is_revenue'] : null;
$programId = isset($_GET['program_id']) ? (int)$_GET['program_id'] : null;
$cohortId = isset($_GET['cohort_id']) ? (int)$_GET['cohort_id'] : null;

try {
    $database = new Database();
    $db = $database->connect();
    $yearlyStats = new CompanyFinancialYearlyStats($db);

    // Build filters array
    $filters = [];
    if ($companyId) $filters['company_id'] = $companyId;
    if ($financialYearId) $filters['financial_year_id'] = $financialYearId;
    if ($isRevenue !== null) $filters['is_revenue'] = $isRevenue;
    if ($programId) $filters['program_id'] = $programId;
    if ($cohortId) $filters['cohort_id'] = $cohortId;

    $result = $yearlyStats->listAll($filters);
    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
