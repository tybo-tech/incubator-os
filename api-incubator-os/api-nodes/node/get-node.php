<?php
include_once '../../config/Database.php';
include_once '../../models/Node.php';

$nodeId = $_GET['nodeId'];

try {
    $database = new Database();
    $db = $database->connect();
    $node = new Node($db);

    $result = $node->getById($nodeId);

    if ($result) {
        echo json_encode($result);
    } else {
        http_response_code(404);
        echo json_encode([
            'error' => 'Node not found'
        ]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'error' => $e->getMessage()
    ]);
}
