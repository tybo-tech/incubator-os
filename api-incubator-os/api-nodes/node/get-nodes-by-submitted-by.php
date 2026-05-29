<?php

include_once '../../config/Database.php';
include_once '../../models/Node.php';

$submittedByName = $_GET['submittedByName'] ?? null;
$type            = $_GET['type'] ?? null;
$parentId        = $_GET['parentId'] ?? null;

try {
    if (!$submittedByName) {
        http_response_code(400);
        echo json_encode(['error' => 'submittedByName parameter is required']);
        return;
    }

    $database = new Database();
    $db       = $database->connect();
    $node     = new Node($db);

    $result = $node->getBySubmittedByName($submittedByName, $type, $parentId);

    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
