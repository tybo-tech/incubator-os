<?php
include_once '../../config/Database.php';
include_once '../../models/CompanyCostingYearlyStats.php';

$data = json_decode(file_get_contents("php://input"), true);

try {
    $database = new Database();
    $db = $database->connect();
    $costingStats = new CompanyCostingYearlyStats($db);

    $id = $data['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'Costing stats ID is required']);
        exit;
    }

    // Filter out the ID from the update data
    unset($data['id']);

    $result = $costingStats->updateCompanyCostingYearlyStats((int)$id, $data);
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