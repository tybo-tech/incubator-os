<?php
include_once '../../config/Database.php';
include_once '../../models/ComplianceRecord.php';

// Get ID from URL parameter
$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($id <= 0) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Valid compliance record ID is required'
    ]);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $complianceRecord = new ComplianceRecord($db);

    $record = $complianceRecord->getById($id);
    
    echo json_encode([
        'success' => true,
        'data' => $record
    ]);

} catch (Exception $e) {
    http_response_code(404);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>