<?php
include_once '../../config/Database.php';
include_once '../../models/MetricTypeAccount.php';
include_once '../../models/User.php';
include_once '../../helpers/AuthGuard.php';
include_once '../../config/headers.php';
/**
 * Update a measure→account binding by id. System Administrator only.
 */
try {
    $db = (new Database())->connect();
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) $input = $_POST;

    $authUser = auth_require_user($db);
    if (!auth_is_migration_admin($authUser)) {
        http_response_code(403);
        echo json_encode(['error' => 'Forbidden — measure bindings require System Administrator.']);
        exit;
    }
    $id = (int)($input['id'] ?? $_GET['id'] ?? 0);
    if (!$id) throw new InvalidArgumentException("id required");
    $model = new MetricTypeAccount($db);
    echo json_encode($model->update($id, is_array($input) ? $input : []));
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
