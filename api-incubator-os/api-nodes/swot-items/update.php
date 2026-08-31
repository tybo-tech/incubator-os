<?php
include_once '../../config/Database.php';
include_once '../../models/SwotItem.php';
include_once '../../config/headers.php';
try {
    $db = (new Database())->connect();
    $model = new SwotItem($db);
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) $input = $_POST;
    $id = (int)($input['id'] ?? $_GET['id'] ?? 0);
    if (!$id) throw new InvalidArgumentException("id required");
    echo json_encode($model->update($id, $input));
} catch (Throwable $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
