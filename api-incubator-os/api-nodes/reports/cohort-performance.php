<?php
include_once '../../config/Database.php';
include_once '../../models/CohortReports.php';
include_once '../../config/headers.php';

$cohortId = isset($_GET['cohort_id']) ? (int)$_GET['cohort_id'] : null;

try {
    $database = new Database();
    $db = $database->connect();
    $reports = new CohortReports($db);

    $result = $reports->cohortPerformanceMetrics($cohortId);
    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
