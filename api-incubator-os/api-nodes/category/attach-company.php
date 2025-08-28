<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

include_once '../../config/Database.php';
include_once '../../models/Categories.php';
include_once '../../config/headers.php';

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $data = json_decode(file_get_contents("php://input"), true);

    // Check if JSON decoding failed
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON: ' . json_last_error_msg()]);
        exit;
    }

    // Log the received data for debugging
    error_log("Received data: " . print_r($data, true));

    // Validate required fields
    $cohortId = (int)($data['cohort_id'] ?? $data['category_id'] ?? 0); // Support both field names

    if (!$cohortId) {
        http_response_code(400);
        echo json_encode(['error' => 'cohort_id is required']);
        exit;
    }

    $database = new Database();
    $db = $database->connect();
    $categories = new Categories($db);

    // Check if this is a bulk operation (array of company_ids) or single operation
    if (isset($data['company_ids']) && is_array($data['company_ids'])) {
        // Bulk operation
        $companyIds = $data['company_ids'];

        if (empty($companyIds)) {
            http_response_code(400);
            echo json_encode(['error' => 'company_ids array cannot be empty']);
            exit;
        }

        // Validate that all company_ids are integers
        foreach ($companyIds as $companyId) {
            if (!is_numeric($companyId) || (int)$companyId <= 0) {
                http_response_code(400);
                echo json_encode(['error' => 'All company_ids must be positive integers']);
                exit;
            }
        }

        error_log("Starting bulk attach for cohort $cohortId with " . count($companyIds) . " companies");

        // Use bulk method
        $result = $categories->bulkAttachCompaniesToCohort(
            $cohortId,
            array_map('intval', $companyIds),
            $data['added_by_user_id'] ?? null,
            $data['notes'] ?? null
        );

        error_log("Bulk attach result: " . print_r($result, true));

        echo json_encode([
            'success' => true,
            'cohort_id' => $cohortId,
            'total_requested' => count($companyIds),
            'results' => $result,
            'message' => implode('. ', $result['details'])
        ]);

    } else {
        // Single operation (existing behavior)
        $companyId = (int)($data['company_id'] ?? 0);

        if (!$companyId) {
            http_response_code(400);
            echo json_encode(['error' => 'company_id is required for single attachment']);
            exit;
        }

        // Use enhanced method with optional metadata
        $result = $categories->attachCompanyToCohort(
            $cohortId,
            $companyId,
            $data['added_by_user_id'] ?? null,
            $data['notes'] ?? null
        );

        echo json_encode($result);
    }

} catch (Exception $e) {
    error_log("Exception in attach-company.php: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());

    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
} catch (Error $e) {
    error_log("Fatal error in attach-company.php: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());

    http_response_code(500);
    echo json_encode([
        'error' => 'Fatal error: ' . $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
?>
