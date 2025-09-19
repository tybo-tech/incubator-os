<?php
include_once '../../config/Database.php';
include_once '../../models/Metrics.php';

$metricTypeId = $_GET['metric_type_id'] ?? null;
$companyId = $_GET['company_id'] ?? null;
$programId = $_GET['program_id'] ?? null;
$cohortId = $_GET['cohort_id'] ?? null;
try {
    foreach(['metric_type_id','company_id','program_id','cohort_id'] as $r) if(!$$r) throw new Exception("$r required");
    $database = new Database(); $db = $database->connect(); $m = new Metrics($db);
    $rows = $m->listRecords((int)$metricTypeId,(int)$companyId,(int)$programId,(int)$cohortId);
    echo json_encode($rows);
} catch (Exception $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
