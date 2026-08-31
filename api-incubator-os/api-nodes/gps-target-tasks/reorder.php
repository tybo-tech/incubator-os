<?php
include_once '../../config/Database.php';
include_once '../../models/GpsTargetTask.php';
include_once '../../models/User.php';
include_once '../../helpers/AuthGuard.php';
include_once '../../config/headers.php';
try {
    $db = (new Database())->connect();
    $model = new GpsTargetTask($db);
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) $input = $_POST;

    $authUser = auth_require_user($db);
    $authInput = $input ?? [];
    if (!is_array($authInput)) $authInput = [];
    auth_enforce_request($db, $authUser, array_merge($_GET, $authInput));
    $gpsId = (int)($input['gps_target_id'] ?? 0);
    $ordered = $input['ordered_ids'] ?? $input['ids'] ?? [];
    if (!$gpsId) throw new InvalidArgumentException("gps_target_id required");
    if (!is_array($ordered)) throw new InvalidArgumentException("ordered_ids must be array");
    echo json_encode($model->reorder($gpsId, array_map('intval',$ordered)));
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
