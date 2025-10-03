<?php
include_once '../../config/Database.php';
include_once '../../models/MetricType.php';
include_once '../../services/RatioCalculatorService.php';

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    $database = new Database();
    $db = $database->connect();
    $ratioService = new RatioCalculatorService($db);

    switch ($method) {
        case 'GET':
            handleGetRatios($ratioService);
            break;

        case 'PUT':
            handleUpdateTargets($ratioService);
            break;

        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
            break;
    }
} catch (Exception $e) {
    error_log("Ratios API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
}

/**
 * Handle GET requests for ratios
 */
function handleGetRatios(RatioCalculatorService $ratioService): void
{
    $requiredParams = ['client_id', 'company_id', 'program_id', 'cohort_id', 'year'];
    $missingParams = [];

    foreach ($requiredParams as $param) {
        if (!isset($_GET[$param])) {
            $missingParams[] = $param;
        }
    }

    if (!empty($missingParams)) {
        http_response_code(400);
        echo json_encode([
            'error' => 'Missing required parameters',
            'missing' => $missingParams
        ]);
        return;
    }

    $clientId = (int)$_GET['client_id'];
    $companyId = (int)$_GET['company_id'];
    $programId = (int)$_GET['program_id'];
    $cohortId = (int)$_GET['cohort_id'];
    $year = (int)$_GET['year'];
    $grouped = isset($_GET['grouped']) && $_GET['grouped'] === 'true';

    try {
        if ($grouped) {
            $ratios = $ratioService->getRatiosGrouped($clientId, $companyId, $programId, $cohortId, $year);
        } else {
            $ratios = $ratioService->getRatiosByYear($clientId, $companyId, $programId, $cohortId, $year);
        }

        echo json_encode([
            'success' => true,
            'data' => $ratios,
            'year' => $year,
            'company_id' => $companyId
        ]);
    } catch (Exception $e) {
        error_log("Error fetching ratios: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch ratios']);
    }
}

/**
 * Handle PUT requests for updating ratio targets
 */
function handleUpdateTargets(RatioCalculatorService $ratioService): void
{
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || !isset($input['ratio_id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid input. ratio_id is required.']);
        return;
    }

    $ratioId = (int)$input['ratio_id'];
    $minTarget = isset($input['min_target']) ? (float)$input['min_target'] : null;
    $idealTarget = isset($input['ideal_target']) ? (float)$input['ideal_target'] : null;

    try {
        $success = $ratioService->updateRatioTargets($ratioId, $minTarget, $idealTarget);

        if ($success) {
            echo json_encode([
                'success' => true,
                'message' => 'Targets updated successfully',
                'ratio_id' => $ratioId
            ]);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Failed to update targets']);
        }
    } catch (Exception $e) {
        error_log("Error updating ratio targets: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update targets']);
    }
}
?>
