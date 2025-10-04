<?php
include_once '../../config/Database.php';
include_once '../../models/Industry.php';

$data = json_decode(file_get_contents("php://input"), true);

try {
    $database = new Database();
    $db = $database->connect();
    $industry = new Industry($db);

    // Get ID from query parameter or JSON body
    $id = $_GET['id'] ?? $data['id'] ?? throw new Exception('ID is required');

    // Extract updateable fields
    $updateFields = [];
    $allowedFields = [
        'name', 'parent_id', 'description', 'notes', 'image_url',
        'icon_class', 'color_theme', 'background_theme', 'tags',
        'is_active', 'display_order', 'created_by'
    ];

    foreach ($allowedFields as $field) {
        if (array_key_exists($field, $data)) {
            $updateFields[$field] = $data[$field];
        }
    }

    // Handle JSON fields
    if (isset($updateFields['tags']) && is_array($updateFields['tags'])) {
        $updateFields['tags'] = json_encode($updateFields['tags']);
    }

    // Handle boolean fields - convert to proper integer values for MySQL
    if (array_key_exists('is_active', $updateFields)) {
        $updateFields['is_active'] = $updateFields['is_active'] ? 1 : 0;
    }

    // Handle integer fields - ensure they are proper integers
    $integerFields = ['parent_id', 'display_order', 'created_by'];
    foreach ($integerFields as $field) {
        if (array_key_exists($field, $updateFields)) {
            $updateFields[$field] = $updateFields[$field] === null ? null : (int)$updateFields[$field];
        }
    }

    $result = $industry->update($id, $updateFields);

    if (!$result) {
        throw new Exception('Industry not found');
    }

    // Return in INode format
    echo json_encode([
        'id' => $result['id'],
        'type' => 'industry',
        'data' => $result
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
