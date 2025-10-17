<?php
include_once '../../config/Database.php';
require_once __DIR__ . '/../../models/CompanyAccounts.php';

try {
    $database = new Database();
    $db = $database->connect();
    $companyAccounts = new CompanyAccounts($db);

    $accountTypes = $companyAccounts->getValidAccountTypes();

    echo json_encode([
        'success' => true,
        'data' => $accountTypes,
        'message' => 'Account types retrieved successfully'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error occurred',
        'error' => $e->getMessage()
    ]);
}
?>
