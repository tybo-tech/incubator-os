<?php
include_once '../../config/Database.php';
include_once '../../models/FormSession.php';

$id = $_GET['id'] ?? null;

try {
    if (!$id) {
        throw new Exception('Missing id parameter');
    }

    $database = new Database();
    $db = $database->connect();
    $formSession = new FormSession($db);

    $result = $formSession->getById((int)$id);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
