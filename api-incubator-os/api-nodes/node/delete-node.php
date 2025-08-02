<?php

include_once '../../config/Database.php';
include_once '../../models/Node.php';

$nodeId = $_GET['nodeId'];

try {
    $database = new Database();
    $db = $database->connect();
    $node = new Node($db);

    // First check if node exists
    $existingNode = $node->getById($nodeId);
    if (!$existingNode) {
        http_response_code(404);
        echo json_encode([
            'error' => 'Node not found'
        ]);
        return;
    }

    $result = $node->delete($nodeId);

    echo json_encode([
        'success' => true,
        'message' => 'Node deleted successfully'
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'error' => $e->getMessage()
    ]);
}
