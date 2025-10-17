<?php
declare(strict_types=1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:4200');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../config/database.php';
require_once '../models/CompanyFinancialYearlyStats.php';

try {
    $database = new Database();
    $pdo = $database->connect();
    $model = new CompanyFinancialYearlyStats($pdo);

    $companyId = (int)($_GET['company_id'] ?? 0);

    if (!$companyId) {
        http_response_code(400);
        echo json_encode(['error' => 'Company ID is required']);
        exit;
    }

    // Get quarterly profit data for all years
    $results = $model->getQuarterlyProfitAllYears($companyId);
    echo json_encode($results);

} catch (Exception $e) {
    error_log("Quarterly Profit API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal server error',
        'message' => $e->getMessage(),
        'debug_info' => [
            'company_id' => $companyId ?? null
        ]
    ]);
}
