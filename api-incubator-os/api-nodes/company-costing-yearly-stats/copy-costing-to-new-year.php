<?php
include_once '../../config/Database.php';
include_once '../../models/CompanyCostingYearlyStats.php';

$data = json_decode(file_get_contents("php://input"), true);

try {
    $database = new Database();
    $db = $database->connect();
    $costingStats = new CompanyCostingYearlyStats($db);

    $companyId = $data['company_id'] ?? null;
    $fromYearId = $data['from_year_id'] ?? null;
    $toYearId = $data['to_year_id'] ?? null;

    if (!$companyId) {
        http_response_code(400);
        echo json_encode(['error' => 'Company ID is required']);
        exit;
    }

    if (!$fromYearId) {
        http_response_code(400);
        echo json_encode(['error' => 'From Year ID is required']);
        exit;
    }

    if (!$toYearId) {
        http_response_code(400);
        echo json_encode(['error' => 'To Year ID is required']);
        exit;
    }

    $result = $costingStats->copyCostingToNewYear((int)$companyId, (int)$fromYearId, (int)$toYearId);
    
    echo json_encode([
        'success' => true,
        'message' => 'Costing data copied successfully',
        'copied_records' => count($result),
        'records' => $result
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>