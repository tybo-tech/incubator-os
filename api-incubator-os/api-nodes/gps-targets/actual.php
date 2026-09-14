<?php
include_once '../../config/Database.php';
include_once '../../models/User.php';
include_once '../../helpers/AuthGuard.php';
include_once '../../services/TargetMeasurementService.php';
include_once '../../config/headers.php';
/**
 * GET ?gps_target_id=  → derived measurement for a target (Sprint 007 Phase 3).
 *
 * Read-only: returns baseline/target period measurements (company-scoped, deduplicated
 * account bindings), per-period completeness, unresolved-row counts, and outcome progress.
 * Nothing is persisted.
 */
try {
    $db = (new Database())->connect();
    $authUser = auth_require_user($db);
    $gpsId = (int)($_GET['gps_target_id'] ?? 0);
    if (!$gpsId) throw new InvalidArgumentException("gps_target_id required");
    auth_require_target_access($db, $authUser, $gpsId);
    echo json_encode((new TargetMeasurementService($db))->calculateForTarget($gpsId));
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
