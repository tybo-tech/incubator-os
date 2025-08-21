<?php
include_once '../../config/Database.php';
include_once '../../models/CompanyFinancials.php';

$data = json_decode(file_get_contents("php://input"), true);

try {
    $database = new Database();
    $db = $database->connect();
    $fin = new CompanyFinancials($db);

    $id = $data['id'] ?? null;
    if (!$id) throw new Exception('id is required');
    $result = $fin->getById((int)$id);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
