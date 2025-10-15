<?php
include_once '../../config/Database.php';
require_once __DIR__ . '/../../models/CompanyAccounts.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed. Use GET.'
    ]);
    exit();
}

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

    $result = $companyAccounts->getById($accountId);

    if ($result['success']) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data' => $result['data'],
            'message' => 'Company account retrieved successfully'
        ]);
    } else {
        $statusCode = $result['message'] === 'Company account not found' ? 404 : 400;
        http_response_code($statusCode);
        echo json_encode($result);
    }

} catch (Exception $e) {
    error_log("Error in get-company-account.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error occurred'
    ]);
}
?>
