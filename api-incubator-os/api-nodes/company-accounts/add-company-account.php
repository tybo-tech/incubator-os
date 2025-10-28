<?php
include_once '../../config/Database.php';
require_once __DIR__ . '/../../models/CompanyAccounts.php';

$data = json_decode(file_get_contents("php://input"), true);

try {
    $database = new Database();
    $db = $database->connect();
    $companyAccounts = new CompanyAccounts($db);

    if (!$data) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid JSON input'
        ]);
        exit();
    }

    $result = $companyAccounts->add($data);

    if ($result['success']) {
        http_response_code(201);
        echo json_encode($result);
    } else {
        http_response_code(400);
        echo json_encode($result);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error occurred',
        'error' => $e->getMessage()
    ]);
}
?>

