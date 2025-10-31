<?php
include_once '../../config/Database.php';
include_once '../../models/ComplianceRecord.php';

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

// Validate operation type
$operation = $data['operation'] ?? '';
$validOperations = ['bulk_create', 'bulk_update', 'bulk_delete', 'bulk_status_update'];

if (!in_array($operation, $validOperations)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid operation. Must be one of: ' . implode(', ', $validOperations)
    ]);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $complianceRecord = new ComplianceRecord($db);

    $results = [];
    $errors = [];

    switch ($operation) {
        case 'bulk_create':
            if (!isset($data['records']) || !is_array($data['records'])) {
                throw new Exception('Records array is required for bulk create');
            }

            foreach ($data['records'] as $index => $recordData) {
                try {
                    $result = $complianceRecord->add($recordData);
                    $results[] = $result;
                } catch (Exception $e) {
                    $errors[] = "Record $index: " . $e->getMessage();
                }
            }
            break;

        case 'bulk_update':
            if (!isset($data['updates']) || !is_array($data['updates'])) {
                throw new Exception('Updates array is required for bulk update');
            }

            foreach ($data['updates'] as $update) {
                if (!isset($update['id']) || !isset($update['data'])) {
                    $errors[] = 'Each update must have id and data fields';
                    continue;
                }

                try {
                    $result = $complianceRecord->update($update['id'], $update['data']);
                    $results[] = $result;
                } catch (Exception $e) {
                    $errors[] = "Record {$update['id']}: " . $e->getMessage();
                }
            }
            break;

        case 'bulk_delete':
            if (!isset($data['ids']) || !is_array($data['ids'])) {
                throw new Exception('IDs array is required for bulk delete');
            }

            foreach ($data['ids'] as $id) {
                try {
                    $deleted = $complianceRecord->delete($id);
                    $results[] = ['id' => $id, 'deleted' => $deleted];
                } catch (Exception $e) {
                    $errors[] = "Record $id: " . $e->getMessage();
                }
            }
            break;

        case 'bulk_status_update':
            if (!isset($data['ids']) || !isset($data['status'])) {
                throw new Exception('IDs array and status are required for bulk status update');
            }

            foreach ($data['ids'] as $id) {
                try {
                    $result = $complianceRecord->update($id, ['status' => $data['status']]);
                    $results[] = $result;
                } catch (Exception $e) {
                    $errors[] = "Record $id: " . $e->getMessage();
                }
            }
            break;
    }

    echo json_encode([
        'success' => true,
        'operation' => $operation,
        'results' => $results,
        'errors' => $errors,
        'total_processed' => count($results),
        'total_errors' => count($errors)
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
