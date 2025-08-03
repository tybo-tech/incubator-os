<?php

include_once '../../config/Database.php';
include_once '../../models/Node.php';

$data = json_decode(file_get_contents("php://input"), true); // Convert to array

try {
    $database = new Database();
    $db = $database->connect();
    $node = new Node($db);

    $result = $node->add(
        $data['type'],
        $data['data'],
        $data['company_id'] ?? null,
        $data['parent_id'] ?? null,
        $data['created_by'] ?? null
    );

    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'error' => $e->getMessage()
    ]);
}
