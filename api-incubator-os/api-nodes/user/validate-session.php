<?php
include_once '../../config/Database.php';
include_once '../../models/User.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

try {
    $userId = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : 0;

    if ($userId <= 0) {
        http_response_code(401);
        echo json_encode(['success' => false, 'valid' => false, 'error' => 'No active session']);
        exit;
    }

    $database = new Database();
    $db = $database->connect();
    $user = new User($db);

    $row = $user->getById($userId);
    if (!$row || (isset($row['status']) && $row['status'] !== 'active')) {
        session_unset();
        session_destroy();
        http_response_code(401);
        echo json_encode(['success' => false, 'valid' => false, 'error' => 'Session expired']);
        exit;
    }

    unset($row['password_hash']);
    echo json_encode(['success' => true, 'valid' => true, 'user' => $row]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'valid' => false, 'error' => 'Session validation failed']);
}
