<?php
include_once '../../config/Database.php';
include_once '../../models/Metrics.php';

$clientId = $_GET['client_id'] ?? null;
$companyId = $_GET['company_id'] ?? null;
$programId = $_GET['program_id'] ?? null;
$cohortId = $_GET['cohort_id'] ?? null;
try {
    foreach(['client_id','company_id','program_id','cohort_id'] as $r) if(!$$r) throw new Exception("$r required");
    $database = new Database(); $db = $database->connect(); $m = new Metrics($db);
    $groups = $m->getFullMetrics((int)$clientId,(int)$companyId,(int)$programId,(int)$cohortId);
    // Cast numeric fields & rename year_
    foreach($groups as &$g){
        foreach($g['types'] as &$t){
            foreach($t['records'] as &$r){
                if(isset($r['year_'])){ $r['year'] = (int)$r['year_']; unset($r['year_']); }
                foreach(['q1','q2','q3','q4','total','margin_pct'] as $n){ if(isset($r[$n]) && $r[$n] !== null) $r[$n] = (float)$r[$n]; }
            }
        }
    }
    echo json_encode($groups);
} catch (Exception $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
