<?php
include_once '../../config/Database.php';
include_once '../../models/CompanyFinancialItems.php';

// Get POST data
$input = file_get_contents("php://input");
$data = json_decode($input, true);

if (!isset($data['items']) || !is_array($data['items']) || count($data['items']) === 0) {
    echo json_encode(['error' => 'Items array is required and cannot be empty']);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $financialItem = new CompanyFinancialItems($db);

    // Start transaction for bulk update
    $db->beginTransaction();

    $updatedItems = [];
    $errors = [];

    foreach ($data['items'] as $index => $item) {
        if (!isset($item['id']) || $item['id'] <= 0) {
            $errors[] = "Item at index {$index}: Valid ID is required";
            continue;
        }

        $id = $item['id'];
        unset($item['id']); // Remove ID from update fields

        try {
            $result = $financialItem->update($id, $item);
            if ($result) {
                $updatedItems[] = $result;
            } else {
                $errors[] = "Item at index {$index}: Failed to update item with ID {$id}";
            }
        } catch (Exception $e) {
            $errors[] = "Item at index {$index}: " . $e->getMessage();
        }
    }

    if (count($errors) > 0) {
        // If there are errors, rollback the transaction
        $db->rollBack();
        echo json_encode([
            'error' => 'Bulk update failed',
            'errors' => $errors,
            'updatedCount' => 0
        ]);
    } else {
        // Commit the transaction if all updates were successful
        $db->commit();
        echo json_encode([
            'success' => true,
            'message' => 'Bulk update completed successfully',
            'updatedCount' => count($updatedItems),
            'updatedItems' => $updatedItems
        ]);
    }

} catch (Exception $e) {
    // Rollback on any unexpected error
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    echo json_encode([
        'error' => 'Database error: ' . $e->getMessage(),
        'updatedCount' => 0
    ]);
}
