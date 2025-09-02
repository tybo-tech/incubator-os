<?php
include_once '../../config/Database.php';
include_once '../../models/Form.php';

$limit = (int)($_GET['limit'] ?? 50);
$offset = (int)($_GET['offset'] ?? 0);

try {
    $database = new Database();
    $db = $database->connect();
    $form = new Form($db);

    $result = $form->list($limit, $offset);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
