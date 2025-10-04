<?php
include_once '../../config/Database.php';
include_once '../../models/CohortReports.php';
include_once '../../config/headers.php';

$cohortIds = $_GET['cohort_ids'] ?? '';

if (empty($cohortIds)) {
    http_response_code(400);
    echo json_encode(['error' => 'cohort_ids parameter is required (comma-separated list)']);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $reports = new CohortReports($db);

    // Parse comma-separated IDs
    $cohortIdsArray = array_map('intval', explode(',', $cohortIds));
    $cohortIdsArray = array_filter($cohortIdsArray); // Remove zero values

    if (empty($cohortIdsArray)) {
        throw new Exception('Invalid cohort IDs provided');
    }

    $result = $reports->cohortComparison($cohortIdsArray);
    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
