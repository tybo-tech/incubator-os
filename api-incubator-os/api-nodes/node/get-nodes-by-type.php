<?php

include_once '../../config/Database.php';
include_once '../../models/Node.php';

$type = $_GET['type'];

try {
    $database = new Database();
    $db = $database->connect();
    $node = new Node($db);

    if (!$type) {
        http_response_code(400);
        echo json_encode([
            'error' => 'Type parameter is required'
        ]);
        return;
    }

    $result = $node->getByType($type);

    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'error' => $e->getMessage()
    ]);
}
