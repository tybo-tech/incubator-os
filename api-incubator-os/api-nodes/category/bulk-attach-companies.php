<?php
include_once '../../config/Database.php';
include_once '../../models/Categories.php';
include_once '../../config/headers.php';

$data = json_decode(file_get_contents("php://input"), true);

// Validate required fields
$cohortId = (int)($data['cohort_id'] ?? $data['category_id'] ?? 0); // Support both field names
$companyIds = $data['company_ids'] ?? [];

if (!$cohortId) {
    http_response_code(400);
    echo json_encode(['error' => 'cohort_id is required']);
    exit;
}

if (!is_array($companyIds) || empty($companyIds)) {
    http_response_code(400);
    echo json_encode(['error' => 'company_ids array is required and cannot be empty']);
    exit;
}

// Validate that all company_ids are integers
foreach ($companyIds as $companyId) {
    if (!is_numeric($companyId) || (int)$companyId <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'All company_ids must be positive integers']);
        exit;
    }
}

try {
    $database = new Database();
    $db = $database->connect();
    $categories = new Categories($db);

    // Use bulk method with optional metadata
    $result = $categories->bulkAttachCompaniesToCohort(
        $cohortId,
        array_map('intval', $companyIds), // Ensure integers
        $data['added_by_user_id'] ?? null,
        $data['notes'] ?? null
    );

    // Return comprehensive results
    echo json_encode([
        'success' => true,
        'cohort_id' => $cohortId,
        'total_requested' => count($companyIds),
        'results' => $result,
        'message' => implode('. ', $result['details'])
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
