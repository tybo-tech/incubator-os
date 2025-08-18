<?php
include_once '../../config/Database.php';
include_once '../../models/User.php';

$id = $_GET['id'] ?? null;
$username = $_GET['username'] ?? null;

try {
    $database = new Database();
    $db = $database->connect();
    $user = new User($db);

    if ($id) {
        $result = $user->getById((int)$id);
    } elseif ($username) {
        $result = $user->getByUsername($username);
    } else {
        throw new Exception('Missing id or username');
    }

    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
