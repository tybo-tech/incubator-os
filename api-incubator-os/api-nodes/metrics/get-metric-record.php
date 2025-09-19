<?php
include_once '../../config/Database.php';
include_once '../../models/Metrics.php';

$id = $_GET['id'] ?? null;
try {
    if(!$id) throw new Exception('id required');
    $database = new Database(); $db = $database->connect(); $m = new Metrics($db);
    $res = $m->getRecordById((int)$id);
    echo json_encode($res);
} catch (Exception $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
