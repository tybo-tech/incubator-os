<?php
include_once '../../config/Database.php';
include_once '../../models/FinancialMetric.php';

$data = json_decode(file_get_contents('php://input'), true);

try {
    if (!$data || !isset($data['id'])) throw new Exception('id is required');

    $id = (int)$data['id'];
    unset($data['id']);

    $database = new Database();
    $db = $database->connect();
    $fm = new FinancialMetric($db);

    // Map possible alternative field name year -> year_
    if (isset($data['year'])) { $data['year_'] = $data['year']; unset($data['year']); }

    $result = $fm->update($id, $data);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
