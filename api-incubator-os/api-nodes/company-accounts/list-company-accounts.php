<?php
include_once '../../config/Database.php';
require_once __DIR__ . '/../../models/CompanyAccounts.php';

try {
    $database = new Database();
    $db = $database->connect();
    $companyAccounts = new CompanyAccounts($db);

    // Get query parameters
    $companyId = isset($_GET['company_id']) ? (int)$_GET['company_id'] : null;
    $accountType = isset($_GET['account_type']) ? $_GET['account_type'] : null;
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
    if ($accountType) {
        $filters['account_type'] = $accountType;
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
        echo json_encode([
            'success' => true,
            'data' => $result['data'],
            'count' => $result['count'],
            'message' => 'Company accounts retrieved successfully'
        ]);
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
}
?>
