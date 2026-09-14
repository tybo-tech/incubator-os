<?php
include_once '../../config/Database.php';
include_once '../../models/Achievement.php';
include_once '../../models/User.php';
include_once '../../helpers/AuthGuard.php';
include_once '../../config/headers.php';
/**
 * Get one achievement (with its evidence). GET ?id=
 */
try {
    $db = (new Database())->connect();
    $authUser = auth_require_user($db);
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) throw new InvalidArgumentException('id required');
    $model = new Achievement($db);
    $row = $model->getById($id);
    if (!$row) { http_response_code(404); echo json_encode(['error' => "achievements id $id not found"]); exit; }
    auth_require_company_access($authUser, (int)$row['company_id']);
    $row['evidence'] = (new AchievementEvidence($db))->listByAchievement($id);
    echo json_encode($row);
} catch (NotFoundException $e) { http_response_code(404); echo json_encode(['error'=>$e->getMessage()]);
} catch (ConflictException $e) { http_response_code(409); echo json_encode(['error'=>$e->getMessage()]);
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
