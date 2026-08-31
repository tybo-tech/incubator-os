<?php
include_once '../../config/Database.php';
include_once '../../models/GpsTargetMetric.php';
include_once '../../config/headers.php';
try {
    $db = (new Database())->connect();
    $model = new GpsTargetMetric($db);
    $gpsId = (int)($_GET['gps_target_id'] ?? 0);
    if ($gpsId) echo json_encode($model->listByTarget($gpsId));
    else echo json_encode($model->listAll($_GET));
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
