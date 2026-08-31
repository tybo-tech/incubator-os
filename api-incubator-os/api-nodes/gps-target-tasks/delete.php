<?php
include_once '../../config/Database.php';
include_once '../../models/GpsTargetTask.php';
include_once '../../config/headers.php';
try {
    $db = (new Database())->connect();
    $model = new GpsTargetTask($db);
    $input = json_decode(file_get_contents('php://input'), true);
    $id = (int)($input['id'] ?? $_GET['id'] ?? $_POST['id'] ?? 0);
    if (!$id) throw new InvalidArgumentException("id required");
    echo json_encode(['success'=>$model->delete($id),'id'=>$id]);
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
