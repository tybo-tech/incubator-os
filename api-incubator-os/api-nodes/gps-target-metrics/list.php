<?php
include_once '../../config/Database.php';
include_once '../../models/GpsTargetMetric.php';
include_once '../../models/User.php';
include_once '../../helpers/AuthGuard.php';
include_once '../../services/TargetMeasurementService.php';
include_once '../../config/headers.php';
try {
    $db = (new Database())->connect();
    $authUser = auth_require_user($db);
    $authInput = $input ?? [];
    if (!is_array($authInput)) $authInput = [];
    auth_enforce_request($db, $authUser, array_merge($_GET, $authInput));
    $model = new GpsTargetMetric($db);
    $gpsId = (int)($_GET['gps_target_id'] ?? 0);
    if ($gpsId) {
        $rows = $model->listByTarget($gpsId);
        // Derived actual is read-only and never persisted (Sprint 007 Phase 3).
        $actual = (new TargetMeasurementService($db))->calculateForTarget($gpsId);
        foreach ($rows as &$r) { $r['actual'] = $actual; }
        unset($r);
        echo json_encode($rows);
    } else {
        echo json_encode($model->listAll($_GET));
    }
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
