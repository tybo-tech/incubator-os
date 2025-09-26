<?php
include_once '../../config/Database.php';
include_once '../../models/MetricType.php';
include_once '../../config/headers.php';

$data = json_decode(file_get_contents('php://input'), true);

try {
    if (!$data || !isset($data['id'])) throw new Exception('id is required');
    $database = new Database();
    $db = $database->connect();
    $mt = new MetricType($db);

    $id = (int)$data['id'];

    // Prepare update data (exclude id from update fields)
    $updateData = $data;
    unset($updateData['id']);

    // Handle categories separately if provided
    if (isset($updateData['category_ids']) && is_array($updateData['category_ids'])) {
        $updateData['categories'] = $updateData['category_ids'];
        unset($updateData['category_ids']);
    }

    $result = $mt->update($id, $updateData);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
