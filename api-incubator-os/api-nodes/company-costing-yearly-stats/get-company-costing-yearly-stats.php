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

    $result = $costingStats->getCompanyCostingYearlyStatsById((int)$id);
    if (!$result) {
        http_response_code(404);
        echo json_encode(['error' => 'Costing stats not found']);
        exit;
    }

    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>