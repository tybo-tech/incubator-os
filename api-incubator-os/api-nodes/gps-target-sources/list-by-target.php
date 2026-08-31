<?php
include_once '../../config/Database.php';
include_once '../../models/GpsTargetSource.php';
include_once '../../config/headers.php';
try {
    $db = (new Database())->connect();
    $model = new GpsTargetSource($db);
    $gpsId = (int)($_GET['gps_target_id'] ?? 0);
    if (!$gpsId) throw new InvalidArgumentException("gps_target_id required");
    echo json_encode($model->listByTarget($gpsId));
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
