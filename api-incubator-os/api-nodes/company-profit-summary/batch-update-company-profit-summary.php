<?php
include_once '../../config/Database.php';
include_once '../../models/CompanyProfitSummary.php';

// Get POST data
$input = file_get_contents("php://input");
$data = json_decode($input, true);

if (!isset($data['records']) || !is_array($data['records']) || empty($data['records'])) {
    echo json_encode(['error' => 'Valid records array is required']);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $profitSummary = new CompanyProfitSummary($db);

    $results = [];
    $errors = [];

    // Begin transaction for atomic updates
    $db->beginTransaction();

    foreach ($data['records'] as $record) {
        if (!isset($record['id']) || $record['id'] <= 0) {
            $errors[] = "Invalid ID for record: " . json_encode($record);
            continue;
        }

        $id = $record['id'];
        unset($record['id']); // Remove ID from update fields

        try {
            $result = $profitSummary->update($id, $record);
            $results[] = [
                'id' => $id,
                'success' => true,
                'data' => $result
            ];
        } catch (Exception $e) {
            $errors[] = "Failed to update record ID {$id}: " . $e->getMessage();
            $results[] = [
                'id' => $id,
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    // If any errors occurred, rollback the transaction
    if (!empty($errors)) {
        $db->rollback();
        echo json_encode([
            'success' => false,
            'error' => 'Some records failed to update',
            'errors' => $errors,
            'results' => $results
        ]);
    } else {
        // Commit the transaction if all updates succeeded
        $db->commit();
        echo json_encode([
            'success' => true,
            'message' => 'All records updated successfully',
            'updated_count' => count($results),
            'results' => $results
        ]);
    }

} catch (Exception $e) {
    // Rollback on any unexpected error
    if (isset($db)) {
        $db->rollback();
    }
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
