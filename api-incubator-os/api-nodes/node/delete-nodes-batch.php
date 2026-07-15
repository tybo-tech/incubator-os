<?php

include_once '../../config/Database.php';
include_once '../../models/Node.php';

$data = json_decode(file_get_contents("php://input"), true);
$ids = $data['ids'] ?? [];

if (empty($ids)) {
    http_response_code(400);
    echo json_encode(['error' => 'ids array is required']);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $node = new Node($db);

    $deleted = 0;
    $stmt = $db->prepare("DELETE FROM nodes WHERE id = ?");
    foreach ($ids as $id) {
        $stmt->execute([(int)$id]);
        $deleted += $stmt->rowCount();
    }

    echo json_encode([
        'success' => true,
        'deleted_count' => $deleted,
        'message' => "$deleted nodes deleted successfully"
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
