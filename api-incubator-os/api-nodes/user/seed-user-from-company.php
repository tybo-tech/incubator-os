<?php
include_once '../../config/Database.php';
include_once '../../models/User.php';

$data = json_decode(file_get_contents("php://input"), true);

try {
    $database = new Database();
    $db = $database->connect();
    $user = new User($db);

    $result = $user->seedFromCompanyRow($data['company'], $data['overrides'] ?? []);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
