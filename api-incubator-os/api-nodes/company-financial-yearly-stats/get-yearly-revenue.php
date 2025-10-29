<?php
require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../models/CompanyFinancialYearlyStats.php';

try {
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method !== 'GET') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        exit;
    }

    $database = new Database();
    $db = $database->connect();
    $model = new CompanyFinancialYearlyStats($db);

    // Get parameters from query string
    $companyId = $_GET['company_id'] ?? null;
    $financialYearId = $_GET['financial_year_id'] ?? null;

    if (!$companyId) {
        http_response_code(400);
        echo json_encode(['error' => 'company_id is required']);
        exit;
    }

    if (!$financialYearId) {
        http_response_code(400);
        echo json_encode(['error' => 'financial_year_id is required']);
        exit;
    }

    $companyId = (int)$companyId;
    $financialYearId = (int)$financialYearId;

    // Get yearly revenue summary
    $result = $model->getYearlyRevenue($companyId, $financialYearId);
    
    echo json_encode($result);

} catch (Exception $e) {
    error_log('Error in get-yearly-revenue.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal server error',
        'message' => $e->getMessage()
    ]);
}
?>