<?php
include_once '../../config/Database.php';
include_once '../../models/Industry.php';

$id = $_GET['id'] ?? null;
$name = $_GET['name'] ?? null;

try {
    $database = new Database();
    $db = $database->connect();
    $industry = new Industry($db);

    if ($id) {
        $result = $industry->getById((int)$id);
    } elseif ($name) {
        $result = $industry->getByName($name);
    } else {
        throw new Exception('Missing id or name');
    }

    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
