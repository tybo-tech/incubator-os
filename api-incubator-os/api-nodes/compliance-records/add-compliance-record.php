<?php
include_once '../../config/Database.php';
include_once '../../models/ComplianceRecord.php';

// Read JSON input
$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON data']);
    exit;
}

// Validate required fields
$requiredFields = ['client_id', 'company_id', 'financial_year_id', 'type'];
foreach ($requiredFields as $field) {
    if (!isset($data[$field]) || empty($data[$field])) {
        http_response_code(400);
        echo json_encode(['error' => "Field '$field' is required"]);
        exit;
    }
}

// Validate type enum - based on common compliance types
$validTypes = ['annual_returns', 'tax_returns', 'bbbee_certificate', 'cipc_registration', 'vat_registration', 'paye_registration', 'uif_registration', 'workmen_compensation', 'other'];
if (!in_array($data['type'], $validTypes)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid compliance type. Must be one of: ' . implode(', ', $validTypes)]);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $complianceRecord = new ComplianceRecord($db);

    $result = $complianceRecord->add($data);
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Compliance record created successfully',
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
