<?php
include_once '../../config/Database.php';
include_once '../../models/SessionFieldResponse.php';

$sessionId = $_GET['session_id'] ?? null;
$withFields = $_GET['with_fields'] ?? false;

try {
    if (!$sessionId) {
        throw new Exception('Missing session_id parameter');
    }

    $database = new Database();
    $db = $database->connect();
    $sessionFieldResponse = new SessionFieldResponse($db);

    if ($withFields) {
        $result = $sessionFieldResponse->getBySessionWithFields((int)$sessionId);
    } else {
        $result = $sessionFieldResponse->getBySession((int)$sessionId);
    }

    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
