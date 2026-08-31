<?php
include_once '../../config/Database.php';
include_once '../../models/GpsTargetSource.php';
include_once '../../models/User.php';
include_once '../../helpers/AuthGuard.php';
include_once '../../config/headers.php';
try {
    $db = (new Database())->connect();
    $model = new GpsTargetSource($db);
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) $input = $_POST;

    $authUser = auth_require_user($db);
    $authInput = $input ?? [];
    if (!is_array($authInput)) $authInput = [];
    auth_enforce_request($db, $authUser, array_merge($_GET, $authInput));
    $checkId = (int)($input['id'] ?? $_GET['id'] ?? 0);
    if ($checkId) {
        $stmtTmp = $db->prepare("SELECT gps_target_id FROM gps_target_sources WHERE id = ?");
        $stmtTmp->execute([$checkId]);
        $tmpGps = $stmtTmp->fetchColumn();
        if ($tmpGps) auth_require_target_access($db, $authUser, (int)$tmpGps);
    }
    $id = (int)($input['id'] ?? $_GET['id'] ?? 0);
    if ($id) { echo json_encode(['success'=>$model->unlink($id),'id'=>$id]); return; }
    // alternative: by gps_target_id + swot_item_id
    $gpsId = (int)($input['gps_target_id'] ?? 0);
    $swotId = (int)($input['swot_item_id'] ?? 0);
    if ($gpsId && $swotId) { echo json_encode(['success'=>$model->unlinkByTargetAndSwot($gpsId,$swotId)]); return; }
    throw new InvalidArgumentException("id or (gps_target_id + swot_item_id) required");
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
