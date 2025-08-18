<?php
include_once '../../config/Database.php';
include_once '../../models/FormSubmission.php';

$data = json_decode(file_get_contents("php://input"), true);

try {
    $database = new Database();
    $db = $database->connect();
    $formSubmission = new FormSubmission($db);

    $result = $formSubmission->delete($data['id']);
    echo json_encode(['success' => $result]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
