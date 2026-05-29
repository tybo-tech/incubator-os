<?php
include_once '../../config/Database.php';
include_once '../../models/User.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

$data = json_decode(file_get_contents("php://input"), true);

try {
    if (!is_array($data) || empty($data['username']) || empty($data['password'])) {
        http_response_code(400);
        echo json_encode(['error' => 'username and password are required']);
        exit;
    }

    $database = new Database();
    $db = $database->connect();
    $user = new User($db);

    $row = $user->getByUsername($data['username']);

    if (!$row) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid username or password']);
        exit;
    }

    if (empty($row['password_hash'])) {
        http_response_code(401);
        echo json_encode(['error' => 'This account has no password set. Please ask an administrator to set your password.']);
        exit;
    }

    if (!password_verify($data['password'], $row['password_hash'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid username or password']);
        exit;
    }

    if (isset($row['status']) && $row['status'] === 'inactive') {
        http_response_code(403);
        echo json_encode(['error' => 'Your account is inactive. Please contact an administrator.']);
        exit;
    }

    session_regenerate_id(true);
    $_SESSION['user_id'] = (int)$row['id'];

    // Return user data — never expose the password hash
    unset($row['password_hash']);
    echo json_encode(['success' => true, 'user' => $row]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error. Please try again.']);
}
