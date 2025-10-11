<?php
include_once '../../config/Database.php';
include_once '../../models/CompanyProfitSummary.php';

// Get the POST data
$input = json_decode(file_get_contents('php://input'), true);
$id = isset($input['id']) ? (int)$input['id'] : 0;

if ($id <= 0) {
    echo json_encode(['error' => 'Valid ID is required']);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $profitSummary = new CompanyProfitSummary($db);

    $success = $profitSummary->delete($id);

    if ($success) {
        echo json_encode(['success' => true, 'message' => 'Profit summary deleted successfully']);
    } else {
        echo json_encode(['error' => 'Profit summary not found or could not be deleted']);
    }
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
