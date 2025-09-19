<?php
include_once '../../config/Database.php';
include_once '../../models/FinancialMetric.php';

$data = json_decode(file_get_contents('php://input'), true);

try {
    if (!$data || !isset($data['id'])) throw new Exception('id is required');
    $database = new Database();
    $db = $database->connect();
    $fm = new FinancialMetric($db);

    $success = $fm->delete((int)$data['id']);
    echo json_encode(['success' => $success]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
