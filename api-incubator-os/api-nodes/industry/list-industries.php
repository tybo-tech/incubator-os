<?php
include_once '../../config/Database.php';
include_once '../../models/Industry.php';

$parentId = isset($_GET['parent_id']) ? ($_GET['parent_id'] === '' ? null : (int)$_GET['parent_id']) : null;

try {
    $database = new Database();
    $db = $database->connect();
    $industry = new Industry($db);

    $opts = [];
    if (isset($parentId)) $opts['parent_id'] = $parentId;
    $result = $industry->list($opts);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
