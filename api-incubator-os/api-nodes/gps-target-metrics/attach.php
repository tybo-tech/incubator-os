<?php
include_once '../../config/Database.php';
include_once '../../models/GpsTargetMetric.php';
include_once '../../models/User.php';
include_once '../../helpers/AuthGuard.php';
include_once '../../config/headers.php';
try {
    $db = (new Database())->connect();
    $model = new GpsTargetMetric($db);
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) $input = $_POST;

    $authUser = auth_require_user($db);
    $authInput = $input ?? [];
    if (!is_array($authInput)) $authInput = [];
    auth_enforce_request($db, $authUser, array_merge($_GET, $authInput));
    echo json_encode($model->attach($input ?? []));
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
