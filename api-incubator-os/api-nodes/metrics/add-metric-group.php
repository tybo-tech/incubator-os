<?php
include_once '../../config/Database.php';
include_once '../../models/Metrics.php';

$data = json_decode(file_get_contents('php://input'), true);
try {
    if(!$data) throw new Exception('Invalid JSON');
    foreach(['client_id','code','name'] as $r) if(!isset($data[$r])) throw new Exception("Missing $r");

    $database = new Database();
    $db = $database->connect();
    $m = new Metrics($db);

    $group = $m->addGroup(
        (int)$data['client_id'],
        $data['code'],
        $data['name'],
        $data['description'] ?? '',
        isset($data['show_total']) ? (int)$data['show_total'] : 1,
        isset($data['show_margin']) ? (int)$data['show_margin'] : 0,
        $data['graph_color'] ?? null
    );
    echo json_encode($group);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error'=>$e->getMessage()]);
}
