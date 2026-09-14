<?php
include_once '../../config/Database.php';
include_once '../../models/Achievement.php';
include_once '../../models/User.php';
include_once '../../helpers/AuthGuard.php';
include_once '../../config/headers.php';
/** GET ?company_id= → achievement counts by status; decisions are excluded from the counts. */
try {
    $db = (new Database())->connect();
    $authUser = auth_require_user($db);
    $companyId = (int)($_GET['company_id'] ?? 0);
    if (!$companyId) throw new InvalidArgumentException('company_id required');
    auth_require_company_access($authUser, $companyId);
    echo json_encode((new Achievement($db))->countsByCompany($companyId));
} catch (NotFoundException $e) { http_response_code(404); echo json_encode(['error'=>$e->getMessage()]);
} catch (ConflictException $e) { http_response_code(409); echo json_encode(['error'=>$e->getMessage()]);
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
