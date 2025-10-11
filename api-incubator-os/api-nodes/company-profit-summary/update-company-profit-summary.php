<?php
include_once '../../config/Database.php';
include_once '../../models/CompanyProfitSummary.php';

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
    $profitSummary = new CompanyProfitSummary($db);

    $id = $data['id'];
    unset($data['id']); // Remove ID from update fields

    // Log the incoming data for debugging
    error_log("Update Profit Summary - ID: $id, Data: " . json_encode($data));

    // Validate that we have required fields for updates
    $allowedFields = [
        'company_id', 'client_id', 'program_id', 'cohort_id', 'year_',
        'gross_q1', 'gross_q2', 'gross_q3', 'gross_q4', 'gross_total', 'gross_margin',
        'operating_q1', 'operating_q2', 'operating_q3', 'operating_q4', 'operating_total', 'operating_margin',
        'npbt_q1', 'npbt_q2', 'npbt_q3', 'npbt_q4', 'npbt_total', 'npbt_margin',
        'unit', 'notes', 'title', 'status_id', 'updated_by'
    ];

    // Filter data to only include allowed fields
    $filteredData = array_intersect_key($data, array_flip($allowedFields));

    if (empty($filteredData)) {
        echo json_encode(['error' => 'No valid fields provided for update']);
        exit;
    }

    // Add updated timestamp
    $filteredData['updated_at'] = date('Y-m-d H:i:s');

    $result = $profitSummary->update($id, $filteredData);

    if ($result) {
        echo json_encode([
            'success' => true,
            'message' => 'Profit summary updated successfully',
            'id' => $id,
            'updated_fields' => array_keys($filteredData)
        ]);
    } else {
        echo json_encode(['error' => 'Failed to update profit summary']);
    }

} catch (Exception $e) {
    error_log("Update Profit Summary Error: " . $e->getMessage());
    echo json_encode(['error' => $e->getMessage()]);
}
