<?php
include_once '../../config/Database.php';
include_once '../../models/CompanyFinancialItems.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data || !isset($data['items']) || !is_array($data['items'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Items array is required']);
        exit;
    }

    $items = $data['items'];
    if (empty($items)) {
        http_response_code(400);
        echo json_encode(['error' => 'At least one item is required']);
        exit;
    }

    $database = new Database();
    $db = $database->connect();
    $model = new CompanyFinancialItems($db);
    $createdItems = [];
    $createdCount = 0;

    // Validate all items first
    foreach ($items as $index => $item) {
        $requiredFields = ['company_id', 'item_type', 'name', 'client_id', 'year_'];
        foreach ($requiredFields as $field) {
            if (!isset($item[$field]) || empty($item[$field])) {
                http_response_code(400);
                echo json_encode(['error' => "Missing required field: $field in item $index"]);
                exit;
            }
        }
    }

    // Create all items
    foreach ($items as $item) {
        try {
            $result = $model->add($item);
            if ($result) {
                $createdItems[] = $result;
                $createdCount++;
            }
        } catch (Exception $e) {
            // If any item fails, continue with others but log the error
            error_log("Failed to create financial item: " . $e->getMessage());
        }
    }

    if ($createdCount === 0) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create any items']);
        exit;
    }

    $response = [
        'success' => true,
        'message' => 'Bulk create completed successfully',
        'createdCount' => $createdCount,
        'totalRequested' => count($items),
        'createdItems' => $createdItems
    ];

    echo json_encode($response);

} catch (Exception $e) {
    error_log('Bulk create error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error: ' . $e->getMessage()]);
}
?>
