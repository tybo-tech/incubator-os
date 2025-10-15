<?php
include_once '../../config/Database.php';
include_once '../../models/FinancialRatios.php';
include_once '../../config/headers.php';

$data = json_decode(file_get_contents('php://input'), true);
$id = isset($data['id']) ? (int)$data['id'] : 0;

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Valid ratio id is required']);
    exit;
}

$fields = array_intersect_key($data, array_flip([
    'min_target', 'ideal_target', 'notes', 'status_id'
]));

try {
    $database = new Database();
    $db = $database->connect();
    $ratios = new FinancialRatios($db);
    $result = $ratios->update($id, $fields);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
