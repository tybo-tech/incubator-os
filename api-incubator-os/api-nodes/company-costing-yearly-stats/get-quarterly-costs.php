<?php
require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../models/CompanyCostingYearlyStats.php';

try {
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method !== 'GET') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        exit;
    }

    $database = new Database();
    $db = $database->connect();
    $model = new CompanyCostingYearlyStats($db);

    // Get company_id from query params
    $companyId = $_GET['company_id'] ?? null;
    $financialYearId = $_GET['financial_year_id'] ?? null;
    $byCategory = isset($_GET['by_category']) && $_GET['by_category'] === 'true';

    if (!$companyId) {
        http_response_code(400);
        echo json_encode(['error' => 'company_id is required']);
        exit;
    }

    $companyId = (int)$companyId;

    if ($financialYearId) {
        // Get quarterly costs for specific year
        $financialYearId = (int)$financialYearId;
        
        if ($byCategory) {
            // Get detailed category breakdown
            $result = $model->getQuarterlyCostsByCategory($companyId, $financialYearId);
        } else {
            // Get summary quarterly costs
            $result = $model->getQuarterlyCosts($companyId, $financialYearId);
        }
        
        echo json_encode($result);
    } else {
        // Get quarterly costs for all years
        $result = $model->getQuarterlyCostsAllYears($companyId);
        echo json_encode($result);
    }

} catch (Exception $e) {
    error_log('Error in get-quarterly-costs.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal server error',
        'message' => $e->getMessage()
    ]);
}
?>
