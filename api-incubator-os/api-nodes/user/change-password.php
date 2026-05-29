<?php
include_once '../../config/Database.php';
include_once '../../models/User.php';

$data = json_decode(file_get_contents("php://input"), true);

try {
    if (!is_array($data) || empty($data['id']) || empty($data['password'])) {
        http_response_code(400);
        echo json_encode(['error' => 'id and password are required']);
        exit;
    }

    $id = (int)$data['id'];
    $password = (string)$data['password'];

    if (strlen($password) < 6) {
        http_response_code(400);
        echo json_encode(['error' => 'Password must be at least 6 characters']);
        exit;
    }

    $database = new Database();
    $db = $database->connect();
    $user = new User($db);

    // Use the User::update() path with plaintext 'password' — prepareFields() hashes it
    $result = $user->update($id, ['password' => $password]);

    if (!$result) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit;
    }

    unset($result['password_hash']);
    echo json_encode(['success' => true, 'user' => $result]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
