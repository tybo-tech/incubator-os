<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

include_once '../../config/Database.php';
include_once '../../config/headers.php';

try {
    $data = json_decode(file_get_contents("php://input"), true);

    // Simple validation
    $cohortId = (int)($data['cohort_id'] ?? 0);
    $companyIds = $data['company_ids'] ?? [];

    if (!$cohortId) {
        http_response_code(400);
        echo json_encode(['error' => 'cohort_id is required']);
        exit;
    }

    if (!is_array($companyIds) || empty($companyIds)) {
        http_response_code(400);
        echo json_encode(['error' => 'company_ids array is required and cannot be empty']);
        exit;
    }

    // Test database connection
    $database = new Database();
    $db = $database->connect();

    // Simple test query to verify cohort exists
    $stmt = $db->prepare("SELECT id, name FROM categories WHERE id = ? AND type = 'cohort'");
    $stmt->execute([$cohortId]);
    $cohort = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$cohort) {
        http_response_code(404);
        echo json_encode(['error' => "Cohort {$cohortId} not found"]);
        exit;
    }

    // Return success with debug info
    echo json_encode([
        'success' => true,
        'message' => 'Debug endpoint working',
        'cohort' => $cohort,
        'company_count' => count($companyIds),
        'company_ids' => array_slice($companyIds, 0, 10), // First 10 for debugging
        'received_data_keys' => array_keys($data)
    ]);

} catch (Exception $e) {
    error_log("Exception in debug endpoint: " . $e->getMessage());

    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
} catch (Error $e) {
    error_log("Fatal error in debug endpoint: " . $e->getMessage());

    http_response_code(500);
    echo json_encode([
        'error' => 'Fatal error: ' . $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
?>
