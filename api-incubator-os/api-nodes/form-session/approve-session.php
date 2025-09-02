<?php
include_once '../../config/Database.php';
include_once '../../models/FormSession.php';

$id = $_GET['id'] ?? null;
$approvedBy = $_GET['approved_by'] ?? null;

try {
    if (!$id || !$approvedBy) {
        throw new Exception('Missing id or approved_by parameter');
    }

    $database = new Database();
    $db = $database->connect();
    $formSession = new FormSession($db);

    $result = $formSession->approve((int)$id, (int)$approvedBy);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
