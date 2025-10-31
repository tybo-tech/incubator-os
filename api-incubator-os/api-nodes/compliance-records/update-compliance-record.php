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

// Read JSON input
$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid JSON data'
    ]);
    exit;
}

// Validate type if provided
if (isset($data['type'])) {
    $validTypes = ['annual_returns', 'tax_returns', 'bbbee_certificate', 'cipc_registration', 'vat_registration', 'paye_registration', 'uif_registration', 'workmen_compensation', 'other'];
    if (!in_array($data['type'], $validTypes)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Invalid compliance type. Must be one of: ' . implode(', ', $validTypes)
        ]);
        exit;
    }
}

try {
    $database = new Database();
    $db = $database->connect();
    $complianceRecord = new ComplianceRecord($db);

    $result = $complianceRecord->update($id, $data);
    
    echo json_encode([
        'success' => true,
        'message' => 'Compliance record updated successfully',
        'data' => $result
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>