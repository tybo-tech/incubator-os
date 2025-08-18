<?php
include_once '../../config/Database.php';
include_once '../../models/FormDefinition.php';

$data = json_decode(file_get_contents("php://input"), true);

try {
    $database = new Database();
    $db = $database->connect();
    $formDefinition = new FormDefinition($db);

    $result = $formDefinition->archive($data['id']);
    echo json_encode(['success' => $result]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
