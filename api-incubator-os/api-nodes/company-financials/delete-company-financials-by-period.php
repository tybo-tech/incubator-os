<?php
include_once '../../config/Database.php';
include_once '../../models/CompanyFinancials.php';

$data = json_decode(file_get_contents("php://input"), true);

try {
    $database = new Database();
    $db = $database->connect();
    $fin = new CompanyFinancials($db);

    $company_id = $data['company_id'] ?? null;
    $period_date = $data['period_date'] ?? null;
    if (!$company_id || !$period_date) throw new Exception('company_id and period_date are required');
    $result = $fin->deleteByCompanyPeriod((int)$company_id, $period_date);
    echo json_encode(['success' => $result]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
