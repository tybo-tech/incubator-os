<?php
include_once '../../config/Database.php';
include_once '../../models/FormNode.php';

$formId = $_GET['form_id'] ?? null;

try {
    if (!$formId) {
        throw new Exception('Missing form_id parameter');
    }

    $database = new Database();
    $db = $database->connect();
    $formNode = new FormNode($db);

    $result = $formNode->getFields((int)$formId);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
