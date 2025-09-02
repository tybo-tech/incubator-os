<?php
include_once '../../config/Database.php';
include_once '../../models/FormSession.php';

$id = $_GET['id'] ?? null;
$data = json_decode(file_get_contents("php://input"), true);

try {
    if (!$id) {
        throw new Exception('Missing id parameter');
    }

    $database = new Database();
    $db = $database->connect();
    $formSession = new FormSession($db);

    $result = $formSession->update((int)$id, $data);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
