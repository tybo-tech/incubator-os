<?php
include_once '../../config/Database.php';
include_once '../../models/CompanyFinancials.php';

$data = json_decode(file_get_contents("php://input"), true) ?? [];

if (!isset($data['company_id'])) {
    echo json_encode(['error' => 'company_id is required']);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $fin = new CompanyFinancials($db);

    $result = $fin->list($data);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
