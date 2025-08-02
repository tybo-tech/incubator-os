<?php

include_once '../../config/Database.php';
include_once '../../models/Node.php';

$data = json_decode(file_get_contents("php://input"), true);

try {
    $database = new Database();
    $db = $database->connect();
    $node = new Node($db);

    $items = $data['items'] ?? [];

    // Convert array items to objects for the Node model
    $nodeObjects = [];
    foreach ($items as $item) {
        $nodeObj = (object) [
            'id' => $item['id'],
            'data' => $item['data'],
            'updated_by' => $item['updatedBy'] ?? null
        ];
        $nodeObjects[] = $nodeObj;
    }

    $result = $node->updateRange($nodeObjects);

    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'error' => $e->getMessage()
    ]);
}
