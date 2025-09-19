<?php
include_once '../../config/Database.php';
include_once '../../models/MetricType.php';

$data = json_decode(file_get_contents('php://input'), true);

try {
    if (!$data) throw new Exception('Invalid JSON body');
    $database = new Database();
    $db = $database->connect();
    $mt = new MetricType($db);

    $code = $data['code'] ?? null;
    $name = $data['name'] ?? null;
    $description = $data['description'] ?? '';
    $default_unit = $data['default_unit'] ?? 'ZAR';
    $is_ratio = isset($data['is_ratio']) ? (int)$data['is_ratio'] : 0;

    if (!$code || !$name) throw new Exception('code and name are required');

    $result = $mt->add($code, $name, $description, $default_unit, $is_ratio);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
