<?php
include_once '../../config/Database.php';
include_once '../../models/Metrics.php';

$groupId = $_GET['group_id'] ?? null;
try {
    if(!$groupId) throw new Exception('group_id required');
    $database = new Database();
    $db = $database->connect();
    $m = new Metrics($db);
    $res = $m->listTypesByGroup((int)$groupId);
    echo json_encode($res);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error'=>$e->getMessage()]);
}
