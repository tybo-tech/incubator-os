<?php
include_once '../../config/Database.php';
include_once '../../models/CompanyCostingYearlyStats.php';

try {
    $database = new Database();
    $db = $database->connect();
    $costingStats = new CompanyCostingYearlyStats($db);

    $id = $_GET['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'Costing stats ID is required']);
        exit;
    }

    $result = $costingStats->deleteCompanyCostingYearlyStats((int)$id);
    if (!$result) {
        http_response_code(404);
        echo json_encode(['error' => 'Costing stats not found or could not be deleted']);
        exit;
    }

    echo json_encode(['success' => true, 'message' => 'Costing stats deleted successfully']);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>