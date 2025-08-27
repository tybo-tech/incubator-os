<?php
include_once '../../config/Database.php';
include_once '../../models/Categories.php';
include_once '../../config/headers.php';

$cohort_id = $_GET['cohort_id'] ?? null;

try {
    $database = new Database();
    $db = $database->connect();
    $categories = new Categories($db);

    if ($cohort_id) {
        $result = $categories->listCompaniesInCohort((int)$cohort_id);
        echo json_encode($result);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'cohort_id parameter required']);
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
