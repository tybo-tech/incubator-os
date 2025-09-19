<?php
include_once '../../config/Database.php';
include_once '../../models/Metrics.php';

$data = json_decode(file_get_contents('php://input'), true);
try {
    if(!$data) throw new Exception('Invalid JSON');
    foreach(['client_id','company_id','program_id','cohort_id','metric_type_id','year'] as $r) if(!isset($data[$r])) throw new Exception("Missing $r");
    $database = new Database(); $db = $database->connect(); $m = new Metrics($db);
    $res = $m->addRecord(
        (int)$data['client_id'], (int)$data['company_id'], (int)$data['program_id'], (int)$data['cohort_id'], (int)$data['metric_type_id'], (int)$data['year'],
        isset($data['q1'])? (float)$data['q1']: null,
        isset($data['q2'])? (float)$data['q2']: null,
        isset($data['q3'])? (float)$data['q3']: null,
        isset($data['q4'])? (float)$data['q4']: null,
        isset($data['total'])? (float)$data['total']: null,
        isset($data['margin_pct'])? (float)$data['margin_pct']: null,
        $data['unit'] ?? 'ZAR'
    );
    echo json_encode($res);
} catch (Exception $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
