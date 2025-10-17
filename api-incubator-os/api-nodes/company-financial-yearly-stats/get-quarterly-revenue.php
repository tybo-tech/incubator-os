<?php
declare(strict_types=1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
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

    // Get company_id from query params
    $companyId = $_GET['company_id'] ?? null;
    $financialYearId = $_GET['financial_year_id'] ?? null;

    if (!$companyId) {
        http_response_code(400);
        echo json_encode(['error' => 'company_id is required']);
        exit;
    }

    $companyId = (int)$companyId;

    if ($financialYearId) {
        // Get quarterly revenue for specific year
        $result = $model->getQuarterlyRevenue($companyId, (int)$financialYearId);
        echo json_encode($result);
    } else {
        // Get quarterly revenue for all years
        $result = $model->getQuarterlyRevenueAllYears($companyId);
        echo json_encode($result);
    }

} catch (Exception $e) {
    error_log('Error in get-quarterly-revenue.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal server error',
        'message' => $e->getMessage()
    ]);
}
?>
