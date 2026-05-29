<?php

include_once '../../config/Database.php';
include_once '../../models/Node.php';

$type = $_GET['type'] ?? null;
$parentId = $_GET['parentId'] ?? null;
$companyId = $_GET['companyId'] ?? null;
$submittedByName = $_GET['submittedByName'] ?? null;
$createdBy = isset($_GET['createdBy']) ? (int)$_GET['createdBy'] : null;

try {
    $database = new Database();
    $db = $database->connect();
    $node = new Node($db);

    $result = $node->search($type, $parentId, $companyId, $submittedByName, $createdBy);

    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'error' => $e->getMessage()
    ]);
}
