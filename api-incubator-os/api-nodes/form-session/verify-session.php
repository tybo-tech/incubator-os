<?php
include_once '../../config/Database.php';
include_once '../../models/FormSession.php';

$id = $_GET['id'] ?? null;
$verifiedBy = $_GET['verified_by'] ?? null;

try {
    if (!$id || !$verifiedBy) {
        throw new Exception('Missing id or verified_by parameter');
    }

    $database = new Database();
    $db = $database->connect();
    $formSession = new FormSession($db);

    $result = $formSession->verify((int)$id, (int)$verifiedBy);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
