<?php
include_once '../../config/Database.php';
include_once '../../models/CompanyFinancials.php';

$data = json_decode(file_get_contents("php://input"), true);

try {
    $database = new Database();
    $db = $database->connect();
    $fin = new CompanyFinancials($db);

    $company_id = $data['company_id'] ?? null;
    if (!$company_id) throw new Exception('company_id is required');
    $result = $fin->latestForCompany((int)$company_id);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
