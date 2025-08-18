<?php
include_once '../../config/Database.php';
include_once '../../models/FormSubmission.php';

$id = $_GET['id'] ?? null;

try {
    $database = new Database();
    $db = $database->connect();
    $formSubmission = new FormSubmission($db);

    if ($id) {
        $result = $formSubmission->getById((int)$id);
    } else {
        throw new Exception('Missing id');
    }

    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
