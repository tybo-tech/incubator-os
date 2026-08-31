<?php
include_once '../../config/Database.php';
include_once '../../models/GpsTarget.php';
include_once '../../models/User.php';
include_once '../../helpers/AuthGuard.php';
include_once '../../config/headers.php';
try {
    $db = (new Database())->connect();
    $authUser = auth_require_user($db);
    $authInput = $input ?? [];
    if (!is_array($authInput)) $authInput = [];
    auth_enforce_request($db, $authUser, array_merge($_GET, $authInput));
    $model = new GpsTarget($db);
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) throw new InvalidArgumentException("id required");
    auth_require_target_access($db, $authUser, $id);
    $row = $model->getById($id);
    if (!$row) { http_response_code(404); echo json_encode(['error'=>"gps_targets id $id not found"]); return; }
    echo json_encode($row);
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
