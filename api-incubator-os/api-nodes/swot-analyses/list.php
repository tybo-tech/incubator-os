<?php
include_once '../../config/Database.php';
include_once '../../models/SwotAnalysis.php';
include_once '../../models/User.php';
include_once '../../helpers/AuthGuard.php';
include_once '../../config/headers.php';

try {
    $database = new Database();
    $db = $database->connect();
    $authUser = auth_require_user($db);
    $authInput = $input ?? [];
    if (!is_array($authInput)) $authInput = [];
    auth_enforce_request($db, $authUser, array_merge($_GET, $authInput));
    $model = new SwotAnalysis($db);
    $filters = [];
    if (isset($_GET['company_id'])) $filters['company_id'] = (int)$_GET['company_id'];
    if (isset($_GET['status'])) $filters['status'] = $_GET['status'];
    if (isset($_GET['is_current'])) $filters['is_current'] = $_GET['is_current'] === '1' || $_GET['is_current'] === 'true';
    if (isset($_GET['limit'])) $filters['limit'] = (int)$_GET['limit'];
    if (isset($_GET['offset'])) $filters['offset'] = (int)$_GET['offset'];
    // also support current=true to return only current
    if (($_GET['current'] ?? '') === '1' && isset($_GET['company_id'])) {
        $row = $model->getCurrentByCompany((int)$_GET['company_id']);
        echo json_encode($row ? [$row] : []);
        return;
    }
    echo json_encode($model->listAll($filters));
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
