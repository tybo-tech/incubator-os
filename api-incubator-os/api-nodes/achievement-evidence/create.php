<?php
include_once '../../config/Database.php';
include_once '../../models/Achievement.php';
include_once '../../models/User.php';
include_once '../../helpers/AuthGuard.php';
include_once '../../config/headers.php';
/**
 * Attach evidence to an achievement DRAFT. POST JSON { achievement_id, source_type, label?, reference?, snapshot_json? }
 * Draft-only: a decided record (verified/rejected/revoked) → 409. `created_by` is the authenticated user.
 */
try {
    $db = (new Database())->connect();
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) $input = $_POST;
    if (!is_array($input)) $input = [];

    $authUser = auth_require_user($db);
    $achievementId = (int)($input['achievement_id'] ?? 0);
    if (!$achievementId) throw new InvalidArgumentException('achievement_id required');

    $achievement = (new Achievement($db))->getById($achievementId);
    if (!$achievement) { http_response_code(404); echo json_encode(['error' => "achievements id $achievementId not found"]); exit; }
    auth_require_company_access($authUser, (int)$achievement['company_id']);

    echo json_encode((new AchievementEvidence($db))->add($achievementId, $input, (int)$authUser['id']));
} catch (NotFoundException $e) { http_response_code(404); echo json_encode(['error'=>$e->getMessage()]);
} catch (ConflictException $e) { http_response_code(409); echo json_encode(['error'=>$e->getMessage()]);
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
