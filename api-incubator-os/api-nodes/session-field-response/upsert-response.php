<?php
include_once '../../config/Database.php';
include_once '../../models/SessionFieldResponse.php';

$sessionId = $_GET['session_id'] ?? null;
$fieldNodeId = $_GET['field_node_id'] ?? null;
$data = json_decode(file_get_contents("php://input"), true);

try {
    if (!$sessionId || !$fieldNodeId) {
        throw new Exception('Missing session_id or field_node_id parameter');
    }

    $database = new Database();
    $db = $database->connect();
    $sessionFieldResponse = new SessionFieldResponse($db);

    $result = $sessionFieldResponse->upsert((int)$sessionId, (int)$fieldNodeId, $data);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
