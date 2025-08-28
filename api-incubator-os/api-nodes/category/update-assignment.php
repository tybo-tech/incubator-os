<?php
include_once '../../config/Database.php';
include_once '../../models/CategoryItem.php';
include_once '../../config/headers.php';

$data = json_decode(file_get_contents("php://input"), true);

$assignmentId = (int)($data['assignment_id'] ?? 0);

if (!$assignmentId) {
    http_response_code(400);
    echo json_encode(['error' => 'assignment_id is required']);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $categoryItem = new CategoryItem($db);

    // Update assignment status/metadata
    $result = $categoryItem->updateAssignment($assignmentId, $data);
    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
