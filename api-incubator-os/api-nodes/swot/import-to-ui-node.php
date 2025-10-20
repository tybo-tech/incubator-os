<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../../config/database.php';
require_once '../../models/SwotImport.php';

try {
    $database = new Database();
    $db = $database->connect();
    $swotImport = new SwotImport($db);

    $companyId = (int)($_GET['company_id'] ?? 0);

    if ($companyId <= 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Valid company_id is required'
        ]);
        exit;
    }

    // Import SWOT data to the first existing UI node
    $result = $swotImport->importSwotToUINode($companyId);

    // Also import to action_items table for action plan functionality
    if ($result['success'] && $result['items_merged'] > 0) {
        $actionItemsResult = $swotImport->importSwotToActionItems();
        $result['action_items_imported'] = $actionItemsResult['total_items_imported'] ?? 0;
    }

    if ($result['success']) {
        echo json_encode([
            'success' => true,
            'data' => $result,
            'message' => $result['message']
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => $result['message'],
            'error_details' => $result
        ]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Import error: ' . $e->getMessage()
    ]);
}
?>
