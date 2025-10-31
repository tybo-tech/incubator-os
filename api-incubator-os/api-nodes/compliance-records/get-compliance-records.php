<?php
include_once '../../config/Database.php';
include_once '../../models/ComplianceRecord.php';

try {
    $database = new Database();
    $db = $database->connect();
    $complianceRecord = new ComplianceRecord($db);

    // Build filters from query parameters
    $filters = [];
    
    // Standard filters
    $allowedFilters = ['tenant_id', 'client_id', 'program_id', 'cohort_id', 'company_id', 'financial_year_id', 'type', 'status'];
    foreach ($allowedFilters as $filter) {
        if (isset($_GET[$filter]) && !empty($_GET[$filter])) {
            $filters[$filter] = $_GET[$filter];
        }
    }

    // Search filter
    if (isset($_GET['search']) && !empty($_GET['search'])) {
        $filters['search'] = $_GET['search'];
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
        'filters_applied' => $filters,
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