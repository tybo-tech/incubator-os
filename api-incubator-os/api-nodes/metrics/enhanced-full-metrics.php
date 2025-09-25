<?php
include_once '../../config/Database.php';
include_once '../../models/Metrics.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

$clientId  = isset($_GET['client_id'])  ? $_GET['client_id']  : null;
$companyId = isset($_GET['company_id']) ? $_GET['company_id'] : null;
$programId = isset($_GET['program_id']) ? $_GET['program_id'] : null;
$cohortId  = isset($_GET['cohort_id'])  ? $_GET['cohort_id']  : null;

try {
    // Validate required parameters
    $params = [
        'client_id'  => $clientId,
        'company_id' => $companyId,
        'program_id' => $programId,
        'cohort_id'  => $cohortId,
    ];

    foreach ($params as $key => $value) {
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

    switch ($method) {
        case 'GET':
            handleGetRequest($m, (int)$clientId, (int)$companyId, (int)$programId, (int)$cohortId, $action);
            break;
        case 'POST':
            handlePostRequest($m, (int)$clientId);
            break;
        case 'PUT':
            handlePutRequest($m);
            break;
        default:
            throw new Exception("Method $method not supported");
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}

function handleGetRequest($m, int $clientId, int $companyId, int $programId, int $cohortId, string $action) {
    switch ($action) {
        case 'categories':
            // Get categories for a specific metric type
            $typeId = intval($_GET['type_id'] ?? 0);
            if (!$typeId) {
                throw new Exception('type_id parameter required');
            }
            $categories = $m->getTypeCategories($typeId);
            echo json_encode(['success' => true, 'data' => $categories]);
            break;

        case 'types-with-categories':
            // Get all metric types that have categories
            $types = $m->getTypesWithCategories($clientId);
            echo json_encode(['success' => true, 'data' => $types]);
            break;

        default:
            // Default: Return full metrics (backward compatibility)
            $groups = $m->getFullMetrics($clientId, $companyId, $programId, $cohortId);

            // Cast numeric fields & rename year_ (backward compatibility)
            foreach($groups as &$g){
                foreach($g['types'] as &$t){
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

                    // Also cast records_by_category if present
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
            break;
    }
}

function handlePostRequest($m, int $clientId) {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';

    switch ($action) {
        case 'update-categories':
            $typeId = intval($input['type_id'] ?? 0);
            $categories = $input['categories'] ?? [];

            if (!$typeId) {
                throw new Exception('type_id is required');
            }

            $result = $m->updateTypeCategories($typeId, $categories);
            echo json_encode(['success' => true, 'data' => $result]);
            break;

        default:
            throw new Exception("Unknown action: $action");
    }
}

function handlePutRequest($m) {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';

    switch ($action) {
        case 'update-type-categories':
            $typeId = intval($input['type_id'] ?? 0);
            $categoryIds = $input['category_ids'] ?? [];

            if (!$typeId) {
                throw new Exception('type_id is required');
            }

            $result = $m->updateTypeCategories($typeId, $categoryIds);
            echo json_encode(['success' => true, 'data' => $result]);
            break;

        default:
            throw new Exception("Unknown action: $action");
    }
}
?>
