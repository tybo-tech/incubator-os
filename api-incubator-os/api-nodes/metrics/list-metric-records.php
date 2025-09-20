<?php
include_once '../../config/Database.php';
include_once '../../models/Metrics.php';

header('Content-Type: application/json');
$metricTypeId = isset($_GET['metric_type_id']) ? (int)$_GET['metric_type_id'] : null;
$companyId    = isset($_GET['company_id']) ? (int)$_GET['company_id'] : null;
$programId    = isset($_GET['program_id']) ? (int)$_GET['program_id'] : null;
$cohortId     = isset($_GET['cohort_id']) ? (int)$_GET['cohort_id'] : null;

try {
    $missing = [];
    if ($metricTypeId === null) $missing[] = 'metric_type_id';
    if ($companyId === null) $missing[] = 'company_id';
    if ($programId === null) $missing[] = 'program_id';
    if ($cohortId === null) $missing[] = 'cohort_id';
    if ($missing) throw new Exception('Missing required params: ' . implode(', ', $missing));

    $database = new Database();
    $db = $database->connect();
    $m = new Metrics($db);
    $rows = $m->listRecords($metricTypeId, $companyId, $programId, $cohortId);

    // Map year_ => year for frontend consistency
    foreach ($rows as &$r) {
        if (isset($r['year_'])) { $r['year'] = (int)$r['year_']; }
    }
    echo json_encode($rows);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
