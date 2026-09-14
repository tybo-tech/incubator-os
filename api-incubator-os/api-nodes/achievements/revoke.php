<?php
include_once '../../config/Database.php';
include_once '../../models/Achievement.php';
include_once '../../models/User.php';
include_once '../../helpers/AuthGuard.php';
include_once '../../config/headers.php';
/**
 * Revoke a VERIFIED achievement. POST JSON { id, reason }. System Administrator only.
 * Reason is required. The record and its evidence are preserved (not deleted).
 */
try {
    $db = (new Database())->connect();
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) $input = $_POST;
    if (!is_array($input)) $input = [];

    $authUser = auth_require_user($db);
    $id = (int)($input['id'] ?? $_GET['id'] ?? 0);
    $reason = (string)($input['reason'] ?? '');
    if (!$id) throw new InvalidArgumentException('id required');

    $model = new Achievement($db);
    $existing = $model->getById($id);
    if (!$existing) { http_response_code(404); echo json_encode(['error' => "achievements id $id not found"]); exit; }
    auth_require_company_access($authUser, (int)$existing['company_id']);
    if (!auth_is_system_administrator($authUser)) {
        http_response_code(403);
        echo json_encode(['error' => 'Forbidden — revocation requires System Administrator.']);
        exit;
    }

    echo json_encode($model->revoke($id, (int)$authUser['id'], $reason));
} catch (NotFoundException $e) { http_response_code(404); echo json_encode(['error'=>$e->getMessage()]);
} catch (ConflictException $e) { http_response_code(409); echo json_encode(['error'=>$e->getMessage()]);
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
