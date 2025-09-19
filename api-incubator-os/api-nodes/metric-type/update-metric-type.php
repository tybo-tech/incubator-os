<?php
include_once '../../config/Database.php';
include_once '../../models/MetricType.php';

$data = json_decode(file_get_contents('php://input'), true);

try {
    if (!$data || !isset($data['id'])) throw new Exception('id is required');
    $database = new Database();
    $db = $database->connect();
    $mt = new MetricType($db);

    $id = (int)$data['id'];
    unset($data['id']);

    $result = $mt->update($id, $data);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
