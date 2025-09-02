<?php
include_once '../../config/Database.php';
include_once '../../models/FormNode.php';

$data = json_decode(file_get_contents("php://input"), true);

try {
    $database = new Database();
    $db = $database->connect();
    $formNode = new FormNode($db);

    $result = $formNode->add($data);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
