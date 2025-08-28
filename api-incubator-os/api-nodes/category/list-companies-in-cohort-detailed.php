<?php
include_once '../../config/Database.php';
include_once '../../models/Categories.php';
include_once '../../config/headers.php';

$cohortId = (int)($_GET['cohort_id'] ?? 0);
$status = $_GET['status'] ?? null; // Optional filter by status

if (!$cohortId) {
    http_response_code(400);
    echo json_encode(['error' => 'cohort_id parameter is required']);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $categories = new Categories($db);

    // Use enhanced method with full company details
    $result = $categories->getCompaniesInCohortDetailed($cohortId, $status);
    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
