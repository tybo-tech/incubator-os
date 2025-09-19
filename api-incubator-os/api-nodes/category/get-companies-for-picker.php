<?php
include_once '../../config/Database.php';
include_once '../../models/Company.php';
include_once '../../models/CategoryItem.php';
include_once '../../config/headers.php';

// Parse input parameters
$cohortId = (int)($_GET['cohort_id'] ?? 0);
$programId = (int)($_GET['program_id'] ?? 0);
$clientId = (int)($_GET['client_id'] ?? 0);
$search = $_GET['search'] ?? '';
// Optional description exact match (e.g., tag like '#fy24')
$description = $_GET['description'] ?? '';
// Optional limit (<=0 means fetch all up to server safety cap)
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
// full=1 returns full company rows
$full = isset($_GET['full']) && (int)$_GET['full'] === 1;

try {
    // Database connection
    $database = new Database();
    $db = $database->connect();

    // Model instantiation
    $company = new Company($db);
    $categoryItem = new CategoryItem($db);

    // Get available companies (not assigned to this cohort)
    $availableCompanies = $company->getAvailableForCohort($cohortId, $search, $description, $limit, $full);

    // Get assigned companies (if cohort provided)
    $assignedCompanies = [];
    if ($cohortId) {
        $assignedCompanies = $categoryItem->getCompaniesInCohort($cohortId, 'active');
    }

    // Format response
    $result = [
        'available_companies' => $availableCompanies,
        'assigned_companies' => $assignedCompanies,
        'search_term' => $search,
        'cohort_id' => $cohortId,
        'program_id' => $programId,
        'client_id' => $clientId,
        'total_available' => count($availableCompanies),
        'total_assigned' => count($assignedCompanies),
        'description_filter' => $description,
        'limit' => $limit,
        'full' => $full
    ];

    // Success response
    echo json_encode($result);

} catch (Exception $e) {
    // Error handling
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
