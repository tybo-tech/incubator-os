<?php
include_once '../../config/Database.php';
include_once '../../models/Categories.php';
include_once '../../config/headers.php';

try {
    $data = json_decode(file_get_contents("php://input"), true);

    // Check if JSON decoding failed
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON: ' . json_last_error_msg()]);
        exit;
    }

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

        // Use bulk method
        $result = $categories->bulkAttachCompaniesToCohort(
            $cohortId,
            array_map('intval', $companyIds),
            $data['added_by_user_id'] ?? null,
            $data['notes'] ?? null
        );

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
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
