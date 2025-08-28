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

try {
    // Database connection
    $database = new Database();
    $db = $database->connect();

    // Model instantiation
    $company = new Company($db);
    $categoryItem = new CategoryItem($db);

    // Get available companies (not assigned to this cohort)
    $availableCompanies = $company->getAvailableForCohort($cohortId, $search);

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
        'total_assigned' => count($assignedCompanies)
    ];

    // Success response
    echo json_encode($result);

} catch (Exception $e) {
    // Error handling
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
