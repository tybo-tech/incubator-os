<?php
include_once '../../config/Database.php';
include_once '../../models/FormNode.php';

$id = $_GET['id'] ?? null;
$data = json_decode(file_get_contents("php://input"), true);

try {
    if (!$id) {
        throw new Exception('Missing id parameter');
    }

    $database = new Database();
    $db = $database->connect();
    $formNode = new FormNode($db);

    $result = $formNode->update((int)$id, $data);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
