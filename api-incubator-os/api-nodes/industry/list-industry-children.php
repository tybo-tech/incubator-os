<?php
include_once '../../config/Database.php';
include_once '../../models/Industry.php';

$parentId = $_GET['parent_id'] ?? null;

try {
    $database = new Database();
    $db = $database->connect();
    $industry = new Industry($db);

    if ($parentId !== null) {
        $result = $industry->listChildren((int)$parentId);
    } else {
        throw new Exception('Missing parent_id');
    }

    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
