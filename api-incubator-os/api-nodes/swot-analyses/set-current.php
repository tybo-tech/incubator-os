<?php
include_once '../../config/Database.php';
include_once '../../models/SwotAnalysis.php';
include_once '../../config/headers.php';

try {
    $database = new Database();
    $db = $database->connect();
    $model = new SwotAnalysis($db);
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) $input = $_POST;
    $id = (int)($input['id'] ?? $_GET['id'] ?? 0);
    if (!$id) throw new InvalidArgumentException("id is required");
    $row = $model->setCurrent($id);
    echo json_encode($row);
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
