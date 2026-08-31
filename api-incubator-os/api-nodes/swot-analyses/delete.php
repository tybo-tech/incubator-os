<?php
include_once '../../config/Database.php';
include_once '../../models/SwotAnalysis.php';
include_once '../../models/User.php';
include_once '../../helpers/AuthGuard.php';
include_once '../../config/headers.php';

try {
    $database = new Database();
    $db = $database->connect();
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) $input = $_POST;
    $authUser = auth_require_user($db);
    $authInput = $input ?? [];
    if (!is_array($authInput)) $authInput = [];
    auth_enforce_request($db, $authUser, array_merge($_GET, $authInput));
    $checkId = (int)($input['id'] ?? $_GET['id'] ?? $_POST['id'] ?? 0);
    if ($checkId) auth_require_swot_analysis_access($db, $authUser, $checkId);
    $model = new SwotAnalysis($db);
    $id = (int)($input['id'] ?? $_GET['id'] ?? $_POST['id'] ?? 0);
    if (!$id) throw new InvalidArgumentException("id is required");
    $ok = $model->delete($id);
    echo json_encode(['success' => $ok, 'id' => $id]);
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
