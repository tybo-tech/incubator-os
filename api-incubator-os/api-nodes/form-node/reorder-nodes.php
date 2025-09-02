<?php
include_once '../../config/Database.php';
include_once '../../models/FormNode.php';

$formId = $_GET['form_id'] ?? null;
$parentId = $_GET['parent_id'] ?? null;
$data = json_decode(file_get_contents("php://input"), true);

try {
    if (!$formId) {
        throw new Exception('Missing form_id parameter');
    }
    if (!isset($data['node_ids']) || !is_array($data['node_ids'])) {
        throw new Exception('Missing or invalid node_ids array');
    }

    $database = new Database();
    $db = $database->connect();
    $formNode = new FormNode($db);

    $result = $formNode->reorder((int)$formId, $parentId ? (int)$parentId : null, $data['node_ids']);
    echo json_encode(['success' => $result]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
