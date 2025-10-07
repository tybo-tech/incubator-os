<?php
include_once '../../config/Database.php';
include_once '../../models/CompanyRevenueSummary.php';

// Get POST data
$input = file_get_contents("php://input");
$data = json_decode($input, true);

if (!isset($data['id']) || $data['id'] <= 0) {
    echo json_encode(['error' => 'Valid ID is required']);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $revenueSummary = new CompanyRevenueSummary($db);

    $id = $data['id'];
    unset($data['id']); // Remove ID from update fields

    $result = $revenueSummary->update($id, $data);
    echo json_encode($result);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}