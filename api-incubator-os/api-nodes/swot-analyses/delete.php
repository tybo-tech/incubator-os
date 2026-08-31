<?php
include_once '../../config/Database.php';
include_once '../../models/SwotAnalysis.php';
include_once '../../config/headers.php';

try {
    $database = new Database();
    $db = $database->connect();
    $model = new SwotAnalysis($db);
    $input = json_decode(file_get_contents('php://input'), true);
    $id = (int)($input['id'] ?? $_GET['id'] ?? $_POST['id'] ?? 0);
    if (!$id) throw new InvalidArgumentException("id is required");
    $ok = $model->delete($id);
    echo json_encode(['success' => $ok, 'id' => $id]);
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
