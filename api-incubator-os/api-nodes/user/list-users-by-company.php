<?php
include_once '../../config/Database.php';
include_once '../../models/User.php';

$companyId = $_GET['company_id'] ?? null;

try {
    $database = new Database();
    $db = $database->connect();
    $user = new User($db);

    if ($companyId) {
        $result = $user->listByCompany((int)$companyId);
    } else {
        throw new Exception('Missing company_id');
    }

    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
