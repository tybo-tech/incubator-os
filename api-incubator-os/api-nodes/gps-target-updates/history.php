<?php
include_once '../../config/Database.php';
include_once '../../models/GpsTargetUpdate.php';
include_once '../../config/headers.php';
try {
    $db = (new Database())->connect();
    $model = new GpsTargetUpdate($db);
    $gpsId = (int)($_GET['gps_target_id'] ?? 0);
    if (!$gpsId) throw new InvalidArgumentException("gps_target_id required");
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    echo json_encode($model->historyByTarget($gpsId, $limit));
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
