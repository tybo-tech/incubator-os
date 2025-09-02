<?php
include_once '../../config/Database.php';
include_once '../../models/SessionFieldResponse.php';

$data = json_decode(file_get_contents("php://input"), true);

try {
    $database = new Database();
    $db = $database->connect();
    $sessionFieldResponse = new SessionFieldResponse($db);

    $result = $sessionFieldResponse->add($data);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
