<?php
include_once '../../config/Database.php';
include_once '../../models/MetricTypeAccount.php';
include_once '../../models/User.php';
include_once '../../helpers/AuthGuard.php';
include_once '../../config/headers.php';
/**
 * List measure→account bindings.
 * GET ?metric_type_id=123  → bindings for one measure
 * GET                      → all bindings (optional ?account_type=)
 * System Administrator only.
 */
try {
    $db = (new Database())->connect();
    $authUser = auth_require_user($db);
    if (!auth_is_migration_admin($authUser)) {
        http_response_code(403);
        echo json_encode(['error' => 'Forbidden — measure bindings require System Administrator.']);
        exit;
    }
    $model = new MetricTypeAccount($db);
    $typeId = (int)($_GET['metric_type_id'] ?? 0);
    if ($typeId > 0) {
        echo json_encode($model->listByType($typeId));
    } else {
        echo json_encode($model->listAll($_GET));
    }
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
