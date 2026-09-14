<?php
include_once '../../config/Database.php';
include_once '../../models/MetricTypeAccount.php';
include_once '../../models/User.php';
include_once '../../helpers/AuthGuard.php';
include_once '../../config/headers.php';
/**
 * Create (or upsert) a measure→account binding.
 * POST { metric_type_id, account_type, account_id?, is_revenue?, combine_mode? }
 * System Administrator only.
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
    $model = new MetricTypeAccount($db);
    echo json_encode($model->bind(is_array($input) ? $input : []));
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
