<?php
include_once '../../config/Database.php';
include_once '../../models/MetricType.php';

try {
    $database = new Database();
    $db = $database->connect();
    $mt = new MetricType($db);

    // Check if group_id filter is provided
    $groupId = isset($_GET['group_id']) ? (int)$_GET['group_id'] : null;

    // Use enhanced method that includes categories
    $result = $mt->getTypesWithCategories();

    // Filter by group_id if provided
    if ($groupId) {
        $result = array_filter($result, function($type) use ($groupId) {
            return $type['group_id'] == $groupId;
        });
        $result = array_values($result); // Re-index array
    }

    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
