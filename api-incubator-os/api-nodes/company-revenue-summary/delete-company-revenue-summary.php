<?php
include_once '../../config/Database.php';
include_once '../../models/CompanyRevenueSummary.php';

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($id <= 0) {
    echo json_encode(['error' => 'Valid ID is required']);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $revenueSummary = new CompanyRevenueSummary($db);

    $success = $revenueSummary->delete($id);

    if ($success) {
        echo json_encode(['success' => true, 'message' => 'Revenue summary deleted successfully']);
    } else {
        echo json_encode(['error' => 'Revenue summary not found or could not be deleted']);
    }
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
