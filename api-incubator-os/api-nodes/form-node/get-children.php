<?php
include_once '../../config/Database.php';
include_once '../../models/FormNode.php';

$parentId = $_GET['parent_id'] ?? null;

try {
    $database = new Database();
    $db = $database->connect();
    $formNode = new FormNode($db);

    if ($parentId) {
        $result = $formNode->getChildren((int)$parentId);
    } else {
        throw new Exception('Missing parent_id parameter');
    }

    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
