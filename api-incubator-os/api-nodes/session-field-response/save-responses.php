<?php
include_once '../../config/Database.php';
include_once '../../models/SessionFieldResponse.php';

$sessionId = $_GET['session_id'] ?? null;
$data = json_decode(file_get_contents("php://input"), true);

try {
    if (!$sessionId) {
        throw new Exception('Missing session_id parameter');
    }
    if (!isset($data['responses']) || !is_array($data['responses'])) {
        throw new Exception('Missing or invalid responses array');
    }

    $database = new Database();
    $db = $database->connect();
    $sessionFieldResponse = new SessionFieldResponse($db);

    $result = $sessionFieldResponse->saveResponses((int)$sessionId, $data['responses']);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
