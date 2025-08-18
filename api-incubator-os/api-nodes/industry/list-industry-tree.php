<?php
include_once '../../config/Database.php';
include_once '../../models/Industry.php';

try {
    $database = new Database();
    $db = $database->connect();
    $industry = new Industry($db);

    $result = $industry->listTree();
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
