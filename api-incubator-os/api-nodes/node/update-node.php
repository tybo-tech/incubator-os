<?php

include_once '../../config/Database.php';
include_once '../../models/Node.php';

$data = json_decode(file_get_contents("php://input"), true);

try {
    $database = new Database();
    $db = $database->connect();
    $node = new Node($db);

    $result = $node->update(
        $data['id'],
        $data['data'] ?? [],
        $data['updatedBy'] ?? null
    );

    if (isset($data['company_id'])) {
        $node->updateCompanyId((int)$data['id'], (int)$data['company_id']);
        $result = $node->getById((int)$data['id']);
    }

    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'error' => $e->getMessage()
    ]);
}
