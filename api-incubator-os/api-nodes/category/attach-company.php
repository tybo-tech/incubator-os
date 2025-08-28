<?php
include_once '../../config/Database.php';
include_once '../../models/Categories.php';
include_once '../../config/headers.php';

$data = json_decode(file_get_contents("php://input"), true);

// Validate required fields
$cohortId = (int)($data['cohort_id'] ?? $data['category_id'] ?? 0); // Support both field names
$companyId = (int)($data['company_id'] ?? 0);

if (!$cohortId || !$companyId) {
    http_response_code(400);
    echo json_encode(['error' => 'cohort_id and company_id are required']);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $categories = new Categories($db);

    // Use enhanced method with optional metadata
    $result = $categories->attachCompanyToCohort(
        $cohortId,
        $companyId,
        $data['added_by_user_id'] ?? null,
        $data['notes'] ?? null
    );

    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
