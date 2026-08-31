<?php
include_once '../../config/Database.php';
include_once '../../models/GpsTarget.php';
include_once '../../models/User.php';
include_once '../../helpers/AuthGuard.php';
include_once '../../config/headers.php';
try {
    $db = (new Database())->connect();
    $model = new GpsTarget($db);
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) $input = $_POST;

    $authUser = auth_require_user($db);
    $authInput = $input ?? [];
    if (!is_array($authInput)) $authInput = [];
    auth_enforce_request($db, $authUser, array_merge($_GET, $authInput));
    $checkId = (int)($input['id'] ?? $_GET['id'] ?? $_POST['id'] ?? 0);
    if ($checkId) auth_require_target_access($db, $authUser, $checkId);
    $id = (int)($input['id'] ?? $_GET['id'] ?? 0);
    if (!$id) throw new InvalidArgumentException("id required");
    echo json_encode($model->update($id, $input));
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
