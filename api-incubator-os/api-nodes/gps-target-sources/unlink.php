<?php
include_once '../../config/Database.php';
include_once '../../models/GpsTargetSource.php';
include_once '../../config/headers.php';
try {
    $db = (new Database())->connect();
    $model = new GpsTargetSource($db);
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) $input = $_POST;
    $id = (int)($input['id'] ?? $_GET['id'] ?? 0);
    if ($id) { echo json_encode(['success'=>$model->unlink($id),'id'=>$id]); return; }
    // alternative: by gps_target_id + swot_item_id
    $gpsId = (int)($input['gps_target_id'] ?? 0);
    $swotId = (int)($input['swot_item_id'] ?? 0);
    if ($gpsId && $swotId) { echo json_encode(['success'=>$model->unlinkByTargetAndSwot($gpsId,$swotId)]); return; }
    throw new InvalidArgumentException("id or (gps_target_id + swot_item_id) required");
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
