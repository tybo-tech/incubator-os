<?php
include_once '../../config/Database.php';
require_once __DIR__ . '/../../models/CompanyAccounts.php';

$data = json_decode(file_get_contents("php://input"), true);

try {
    $database = new Database();
    $db = $database->connect();
    $companyAccounts = new CompanyAccounts($db);

    // Get account ID from URL parameter
    $accountId = isset($_GET['id']) ? (int)$_GET['id'] : null;

    if (!$accountId) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Account ID is required'
        ]);
        exit();
    }

    if (!$data) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid JSON input'
        ]);
        exit();
    }

    $result = $companyAccounts->update($accountId, $data);

    if ($result['success']) {
        echo json_encode($result);
    } else {
        $statusCode = $result['message'] === 'Company account not found' ? 404 : 400;
        http_response_code($statusCode);
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
