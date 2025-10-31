<?php
include_once '../../config/Database.php';
include_once '../../models/ComplianceRecord.php';

// Get company ID from URL parameter
$companyId = isset($_GET['company_id']) ? (int)$_GET['company_id'] : 0;

if ($companyId <= 0) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Valid company ID is required'
    ]);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $complianceRecord = new ComplianceRecord($db);

    // Build filters with company_id
    $filters = ['company_id' => $companyId];
    
    // Additional optional filters
    $allowedFilters = ['financial_year_id', 'type', 'status'];
    foreach ($allowedFilters as $filter) {
        if (isset($_GET[$filter]) && !empty($_GET[$filter])) {
            $filters[$filter] = $_GET[$filter];
        }
    }

    // Pagination
    if (isset($_GET['limit']) && is_numeric($_GET['limit'])) {
        $filters['limit'] = (int)$_GET['limit'];
    }
    if (isset($_GET['offset']) && is_numeric($_GET['offset'])) {
        $filters['offset'] = (int)$_GET['offset'];
    }

    $records = $complianceRecord->listAll($filters);
    
    echo json_encode([
        'success' => true,
        'data' => $records,
        'company_id' => $companyId,
        'total_returned' => count($records)
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>