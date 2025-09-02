<?php
include_once '../../config/Database.php';
include_once '../../models/SessionFieldResponse.php';

$fieldNodeId = $_GET['field_node_id'] ?? null;
$filters = [];

// Build filters from query parameters
if (isset($_GET['session_ids'])) {
    $sessionIds = explode(',', $_GET['session_ids']);
    $filters['session_ids'] = array_map('intval', $sessionIds);
}

try {
    if (!$fieldNodeId) {
        throw new Exception('Missing field_node_id parameter');
    }

    $database = new Database();
    $db = $database->connect();
    $sessionFieldResponse = new SessionFieldResponse($db);

    $result = $sessionFieldResponse->getByField((int)$fieldNodeId, $filters);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
