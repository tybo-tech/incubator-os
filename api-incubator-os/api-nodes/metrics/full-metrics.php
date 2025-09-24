<?php
include_once '../../config/Database.php';
include_once '../../models/Metrics.php';

$clientId  = isset($_GET['client_id'])  ? $_GET['client_id']  : null;
$companyId = isset($_GET['company_id']) ? $_GET['company_id'] : null;
$programId = isset($_GET['program_id']) ? $_GET['program_id'] : null;
$cohortId  = isset($_GET['cohort_id'])  ? $_GET['cohort_id']  : null;

try {
    $params = [
        'client_id'  => $clientId,
        'company_id' => $companyId,
        'program_id' => $programId,
        'cohort_id'  => $cohortId,
    ];

    foreach ($params as $key => $value) {
        // Accept 0 as valid; only error if null or empty string
        if ($value === null || $value === '') {
            throw new Exception("$key required");
        }
        if (!is_numeric($value)) {
            throw new Exception("$key must be numeric");
        }
    }

    $database = new Database();
    $db = $database->connect();
    $m = new Metrics($db);
    $groups = $m->getFullMetrics((int)$clientId, (int)$companyId, (int)$programId, (int)$cohortId);

    // Cast numeric fields & rename year_ (enhanced to support new fields)
    foreach($groups as &$g){
        foreach($g['types'] as &$t){
            // Process regular records
            foreach($t['records'] as &$r){
                if(isset($r['year_'])){
                    $r['year'] = (int)$r['year_'];
                    unset($r['year_']);
                }
                foreach(['q1','q2','q3','q4','total','margin_pct'] as $n){
                    if(isset($r[$n]) && $r[$n] !== null) {
                        $r[$n] = (float)$r[$n];
                    }
                }
            }

            // Process categorized records if present
            if (isset($t['records_by_category'])) {
                foreach ($t['records_by_category'] as &$categoryRecords) {
                    foreach ($categoryRecords as &$r) {
                        if(isset($r['year_'])){
                            $r['year'] = (int)$r['year_'];
                            unset($r['year_']);
                        }
                        foreach(['q1','q2','q3','q4','total','margin_pct'] as $n){
                            if(isset($r[$n]) && $r[$n] !== null) {
                                $r[$n] = (float)$r[$n];
                            }
                        }
                    }
                }
            }
        }
    }

    echo json_encode($groups);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
