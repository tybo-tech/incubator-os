<?php
include_once '../../config/Database.php';
include_once '../../models/GpsTargetUpdate.php';
include_once '../../models/User.php';
include_once '../../helpers/AuthGuard.php';
include_once '../../config/headers.php';
try {
    $db = (new Database())->connect();
    $authUser = auth_require_user($db);
    $authInput = $input ?? [];
    if (!is_array($authInput)) $authInput = [];
    auth_enforce_request($db, $authUser, array_merge($_GET, $authInput));
    $model = new GpsTargetUpdate($db);
    $gpsId = (int)($_GET['gps_target_id'] ?? 0);
    if (!$gpsId) throw new InvalidArgumentException("gps_target_id required");
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    echo json_encode($model->historyByTarget($gpsId, $limit));
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
