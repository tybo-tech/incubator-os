<?php
include_once '../../config/Database.php';
include_once '../../models/GpsTarget.php';
include_once '../../models/User.php';
include_once '../../helpers/AuthGuard.php';
include_once '../../config/headers.php';
try {
    $db = (new Database())->connect();
    $authUser = auth_require_user($db);
    $authInput = $input ?? [];
    if (!is_array($authInput)) $authInput = [];
    auth_enforce_request($db, $authUser, array_merge($_GET, $authInput));
    $model = new GpsTarget($db);
    $companyId = (int)($_GET['company_id'] ?? 0);
    if (!$companyId) throw new InvalidArgumentException("company_id is required");
    echo json_encode([
        'company_id' => $companyId,
        'counts' => $model->dashboardCounts($companyId),
        'by_category' => $model->categoryCounts($companyId),
    ]);
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
