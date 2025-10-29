<?php
include_once '../../config/Database.php';
include_once '../../models/CompanyCostingYearlyStats.php';

try {
    $database = new Database();
    $db = $database->connect();
    $costingStats = new CompanyCostingYearlyStats($db);

    // Get query parameters for filtering
    $filters = [];
    if (isset($_GET['company_id'])) {
        $filters['company_id'] = $_GET['company_id'];
    }
    if (isset($_GET['financial_year_id'])) {
        $filters['financial_year_id'] = $_GET['financial_year_id'];
    }
    if (isset($_GET['cost_type'])) {
        $filters['cost_type'] = $_GET['cost_type'];
    }
    if (isset($_GET['category_id'])) {
        $filters['category_id'] = $_GET['category_id'];
    }
    if (isset($_GET['client_id'])) {
        $filters['client_id'] = $_GET['client_id'];
    }
    if (isset($_GET['program_id'])) {
        $filters['program_id'] = $_GET['program_id'];
    }
    if (isset($_GET['cohort_id'])) {
        $filters['cohort_id'] = $_GET['cohort_id'];
    }

    $result = $costingStats->listCompanyCostingYearlyStats($filters);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>