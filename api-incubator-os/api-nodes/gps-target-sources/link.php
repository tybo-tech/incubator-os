<?php
include_once '../../config/Database.php';
include_once '../../models/GpsTargetSource.php';
include_once '../../config/headers.php';
try {
    $db = (new Database())->connect();
    $model = new GpsTargetSource($db);
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) $input = $_POST;
    echo json_encode($model->link($input ?? []));
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
