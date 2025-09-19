<?php
include_once '../../config/Database.php';
include_once '../../models/Metrics.php';

$clientId = $_GET['client_id'] ?? null;
try {
    if(!$clientId) throw new Exception('client_id required');
    $database = new Database();
    $db = $database->connect();
    $m = new Metrics($db);
    $res = $m->listGroups((int)$clientId);
    echo json_encode($res);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error'=>$e->getMessage()]);
}
