<?php
/**
 * Backend Update Endpoint Example for Profit Summary
 * File: api-incubator-os/api-nodes/company-profit-summary/update.php
 *
 * This endpoint expects the ProfitSaveData format from the Angular frontend
 */

require_once '../common/common.php';

header('Content-Type: application/json');

try {
    // Get the raw POST data
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data) {
        throw new Exception('Invalid JSON data');
    }

    // Extract ID from data
    $id = (int)$data['id'];
    if (!$id) {
        throw new Exception('ID is required');
    }

    // Remove ID from data since it's used in WHERE clause
    unset($data['id']);

    // Validate required fields
    $requiredFields = ['company_id', 'client_id', 'program_id', 'cohort_id', 'year_', 'type'];
    foreach ($requiredFields as $field) {
        if (!isset($data[$field])) {
            throw new Exception("Missing required field: $field");
        }
    }

    // Build dynamic UPDATE query
    $fields = [];
    $params = [':id' => $id];

    foreach ($data as $key => $value) {
        $fields[] = "$key = :$key";
        $params[":$key"] = $value;
    }

    $sql = "UPDATE company_profit_summary SET " . implode(', ', $fields) . " WHERE id = :id";

    // Execute the update
    $stmt = $db->prepare($sql);
    $result = $stmt->execute($params);

    if (!$result) {
        throw new Exception('Failed to update record');
    }

    // Check if any rows were affected
    if ($stmt->rowCount() === 0) {
        throw new Exception('No record found with the specified ID');
    }

    // Return success response
    echo json_encode([
        'success' => true,
        'message' => 'Profit summary updated successfully',
        'id' => $id,
        'updated_fields' => array_keys($data)
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
