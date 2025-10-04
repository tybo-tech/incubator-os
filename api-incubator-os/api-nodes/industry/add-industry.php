<?php
include_once '../../config/Database.php';
include_once '../../models/Industry.php';

$data = json_decode(file_get_contents("php://input"), true);

try {
    $database = new Database();
    $db = $database->connect();
    $industry = new Industry($db);

    // Extract required fields
    $name = $data['name'] ?? throw new Exception('Name is required');
    $parentId = $data['parent_id'] ?? null;

    // Extract optional fields
    $extraFields = [];
    $allowedFields = [
        'description', 'notes', 'image_url', 'icon_class',
        'color_theme', 'background_theme', 'tags', 'is_active',
        'display_order', 'created_by'
    ];

    foreach ($allowedFields as $field) {
        if (array_key_exists($field, $data)) {
            $extraFields[$field] = $data[$field];
        }
    }

    // Set defaults
    if (!isset($extraFields['is_active'])) {
        $extraFields['is_active'] = 1;
    }
    if (!isset($extraFields['display_order'])) {
        $extraFields['display_order'] = 0;
    }

    // Handle JSON fields
    if (isset($extraFields['tags']) && is_array($extraFields['tags'])) {
        $extraFields['tags'] = json_encode($extraFields['tags']);
    }

    $result = $industry->add($name, $parentId, $extraFields);

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
