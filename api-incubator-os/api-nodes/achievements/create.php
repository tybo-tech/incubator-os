<?php
include_once '../../config/Database.php';
include_once '../../models/Achievement.php';
include_once '../../models/User.php';
include_once '../../helpers/AuthGuard.php';
include_once '../../config/headers.php';
/**
 * Create an achievement (draft). POST JSON.
 * `recorded_by` is ALWAYS the authenticated user — any posted value is ignored.
 */
try {
    $db = (new Database())->connect();
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) $input = $_POST;
    if (!is_array($input)) $input = [];

    $authUser = auth_require_user($db);
    $companyId = (int)($input['company_id'] ?? 0);
    if (!$companyId) throw new InvalidArgumentException('company_id required');
    auth_require_company_access($authUser, $companyId);

    echo json_encode((new Achievement($db))->create($input, (int)$authUser['id']));
} catch (NotFoundException $e) { http_response_code(404); echo json_encode(['error'=>$e->getMessage()]);
} catch (ConflictException $e) { http_response_code(409); echo json_encode(['error'=>$e->getMessage()]);
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
