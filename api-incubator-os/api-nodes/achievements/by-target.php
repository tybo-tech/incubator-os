<?php
include_once '../../config/Database.php';
include_once '../../models/Achievement.php';
include_once '../../models/User.php';
include_once '../../helpers/AuthGuard.php';
include_once '../../config/headers.php';
/** GET ?gps_target_id= → achievements linked to a target. */
try {
    $db = (new Database())->connect();
    $authUser = auth_require_user($db);
    $targetId = (int)($_GET['gps_target_id'] ?? 0);
    if (!$targetId) throw new InvalidArgumentException('gps_target_id required');
    auth_require_target_access($db, $authUser, $targetId);
    echo json_encode((new Achievement($db))->listByTarget($targetId));
} catch (NotFoundException $e) { http_response_code(404); echo json_encode(['error'=>$e->getMessage()]);
} catch (ConflictException $e) { http_response_code(409); echo json_encode(['error'=>$e->getMessage()]);
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
