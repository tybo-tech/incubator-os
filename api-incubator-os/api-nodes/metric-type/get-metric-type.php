<?php
include_once '../../config/Database.php';
include_once '../../models/MetricType.php';

$id = $_GET['id'] ?? null;
$code = $_GET['code'] ?? null;

try {
    if (!$id && !$code) throw new Exception('Missing id or code');
    $database = new Database();
    $db = $database->connect();
    $mt = new MetricType($db);

    $result = $id ? $mt->getById((int)$id) : $mt->getByCode($code);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
