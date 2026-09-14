<?php
include_once '../../config/Database.php';
include_once '../../models/MetricTypeAccount.php';
include_once '../../models/User.php';
include_once '../../helpers/AuthGuard.php';
include_once '../../config/headers.php';
/**
 * Get a single measure→account binding by id. System Administrator only.
 */
try {
    $db = (new Database())->connect();
    $authUser = auth_require_user($db);
    if (!auth_is_migration_admin($authUser)) {
        http_response_code(403);
        echo json_encode(['error' => 'Forbidden — measure bindings require System Administrator.']);
        exit;
    }
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) throw new InvalidArgumentException("id required");
    $model = new MetricTypeAccount($db);
    $row = $model->getById($id);
    if (!$row) { http_response_code(404); echo json_encode(['error' => "metric_type_accounts id $id not found"]); exit; }
    echo json_encode($row);
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
