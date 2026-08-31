<?php
include_once '../../config/Database.php';
include_once '../../models/GpsTarget.php';
include_once '../../config/headers.php';
try {
    $db = (new Database())->connect();
    $model = new GpsTarget($db);
    $companyId = (int)($_GET['company_id'] ?? 0);
    if (!$companyId) throw new InvalidArgumentException("company_id is required");
    echo json_encode($model->groupedByCategory($companyId));
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
