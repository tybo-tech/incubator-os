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

    // Get query parameters
    $companyId = isset($_GET['company_id']) ? (int)$_GET['company_id'] : null;
    $isActive = null;
    if (isset($_GET['is_active'])) {
        $activeValue = $_GET['is_active'];
        if ($activeValue === 'true' || $activeValue === '1' || $activeValue === 1) {
            $isActive = 1;
        } elseif ($activeValue === 'false' || $activeValue === '0' || $activeValue === 0) {
            $isActive = 0;
        }
    }
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : null;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : null;

    // Build filters array
    $filters = [];
    if ($companyId) {
        $filters['company_id'] = $companyId;
    }
    if ($isActive !== null) {
        $filters['is_active'] = $isActive;
    }
    if ($limit) {
        $filters['limit'] = $limit;
        if ($offset) {
            $filters['offset'] = $offset;
        }
    }

    $result = $companyAccounts->listAll($filters);

    if ($result['success']) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data' => $result['data'],
            'count' => $result['count'],
            'message' => 'Company accounts retrieved successfully'
        ]);
    } else {
        error_log("CompanyAccounts listAll failed: " . json_encode($result));
        http_response_code(400);
        echo json_encode($result);
    }

} catch (Exception $e) {
    error_log("Error in list-company-accounts.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error occurred'
    ]);
}
?>
