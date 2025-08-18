<?php
include_once '../../config/Database.php';
include_once '../../models/FormSubmission.php';

$data = json_decode(file_get_contents("php://input"), true);

try {
    $database = new Database();
    $db = $database->connect();
    $formSubmission = new FormSubmission($db);

    $result = $formSubmission->updatePayload(
        $data['id'],
        $data['payload'],
        $data['updated_by'] ?? null
    );

    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
