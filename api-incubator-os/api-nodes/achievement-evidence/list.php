<?php
include_once '../../config/Database.php';
include_once '../../models/Achievement.php';
include_once '../../models/User.php';
include_once '../../helpers/AuthGuard.php';
include_once '../../config/headers.php';
/** GET ?achievement_id= → evidence for an achievement (snapshots include a decoded `snapshot`). */
try {
    $db = (new Database())->connect();
    $authUser = auth_require_user($db);
    $achievementId = (int)($_GET['achievement_id'] ?? 0);
    if (!$achievementId) throw new InvalidArgumentException('achievement_id required');

    $achievement = (new Achievement($db))->getById($achievementId);
    if (!$achievement) { http_response_code(404); echo json_encode(['error' => "achievements id $achievementId not found"]); exit; }
    auth_require_company_access($authUser, (int)$achievement['company_id']);

    echo json_encode((new AchievementEvidence($db))->listByAchievement($achievementId));
} catch (NotFoundException $e) { http_response_code(404); echo json_encode(['error'=>$e->getMessage()]);
} catch (ConflictException $e) { http_response_code(409); echo json_encode(['error'=>$e->getMessage()]);
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
