<?php
include_once '../../config/Database.php';
include_once '../../models/GpsTargetSource.php';
include_once '../../config/headers.php';
try {
    $db = (new Database())->connect();
    $model = new GpsTargetSource($db);
    $swotId = (int)($_GET['swot_item_id'] ?? 0);
    if (!$swotId) throw new InvalidArgumentException("swot_item_id required");
    echo json_encode($model->listBySwotItem($swotId));
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
