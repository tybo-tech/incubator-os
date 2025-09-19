<?php
include_once '../../config/Database.php';
include_once '../../models/Metrics.php';

$data = json_decode(file_get_contents('php://input'), true);
try {
    if(!$data || !isset($data['id'])) throw new Exception('id required');
    $id = (int)$data['id']; unset($data['id']);
    if(isset($data['year'])) { $data['year_'] = $data['year']; unset($data['year']); }
    $database = new Database(); $db = $database->connect(); $m = new Metrics($db);
    $res = $m->updateRecord($id, $data);
    echo json_encode($res);
} catch (Exception $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
