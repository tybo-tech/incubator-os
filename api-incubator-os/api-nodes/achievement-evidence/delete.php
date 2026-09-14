<?php
include_once '../../config/Database.php';
include_once '../../models/Achievement.php';
include_once '../../models/User.php';
include_once '../../helpers/AuthGuard.php';
include_once '../../config/headers.php';
/**
 * Delete DRAFT evidence. POST JSON { id } (or GET ?id=).
 * Success shape: { success: true, deleted: bool, id }. On a decided record → 409.
 */
try {
    $db = (new Database())->connect();
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) $input = $_POST;
    if (!is_array($input)) $input = [];

    $authUser = auth_require_user($db);
    $id = (int)($input['id'] ?? $_GET['id'] ?? 0);
    if (!$id) throw new InvalidArgumentException('id required');

    $evidence = (new AchievementEvidence($db))->getById($id);
    if (!$evidence) { http_response_code(404); echo json_encode(['error' => "achievement_evidence id $id not found"]); exit; }
    $achievement = (new Achievement($db))->getById((int)$evidence['achievement_id']);
    if (!$achievement) { http_response_code(404); echo json_encode(['error' => 'Parent achievement not found']); exit; }
    auth_require_company_access($authUser, (int)$achievement['company_id']);

    echo json_encode((new AchievementEvidence($db))->delete($id));
} catch (NotFoundException $e) { http_response_code(404); echo json_encode(['error'=>$e->getMessage()]);
} catch (ConflictException $e) { http_response_code(409); echo json_encode(['error'=>$e->getMessage()]);
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
