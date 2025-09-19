<?php
include_once '../../config/Database.php';
include_once '../../models/MetricType.php';

try {
    $database = new Database();
    $db = $database->connect();
    $mt = new MetricType($db);

    $result = $mt->listAll();
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
