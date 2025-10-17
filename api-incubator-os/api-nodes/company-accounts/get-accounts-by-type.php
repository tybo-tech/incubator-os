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
    $activeOnly = true;
    if (isset($_GET['active_only'])) {
        $activeValue = $_GET['active_only'];
        $activeOnly = ($activeValue === 'true' || $activeValue === '1' || $activeValue === 1);
    }

    if (!$accountType) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'account_type parameter is required'
        ]);
        exit();
    }

    // Validate account type
    $validTypes = array_keys($companyAccounts->getValidAccountTypes());
    if (!in_array($accountType, $validTypes)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid account_type. Valid types are: ' . implode(', ', $validTypes)
        ]);
        exit();
    }

    if ($companyId) {
        $result = $companyAccounts->getByCompanyIdAndType($companyId, $accountType, $activeOnly);
    } else {
        $result = $companyAccounts->getByType($accountType, $activeOnly);
    }

    if ($result['success']) {
        echo json_encode([
            'success' => true,
            'data' => $result['data'],
            'count' => $result['count'],
            'message' => 'Accounts retrieved successfully'
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
