<?php
include_once '../../config/Database.php';
include_once '../../models/GpsTargetMetric.php';
include_once '../../config/headers.php';
try {
    $db = (new Database())->connect();
    $model = new GpsTargetMetric($db);
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) $input = $_POST;
    $id = (int)($input['id'] ?? $_GET['id'] ?? 0);
    if ($id) { echo json_encode(['success'=>$model->detach($id)]); return; }
    $gpsId = (int)($input['gps_target_id'] ?? 0);
    $mtId = (int)($input['metric_type_id'] ?? 0);
    if ($gpsId && $mtId) { echo json_encode(['success'=>$model->detachByTargetAndType($gpsId,$mtId)]); return; }
    throw new InvalidArgumentException("id or (gps_target_id+metric_type_id) required");
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
