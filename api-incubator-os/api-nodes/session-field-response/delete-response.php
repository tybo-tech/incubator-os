<?php
include_once '../../config/Database.php';
include_once '../../models/SessionFieldResponse.php';

$id = $_GET['id'] ?? null;

try {
    if (!$id) {
        throw new Exception('Missing id parameter');
    }

    $database = new Database();
    $db = $database->connect();
    $sessionFieldResponse = new SessionFieldResponse($db);

    $result = $sessionFieldResponse->delete((int)$id);
    echo json_encode(['success' => $result]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
