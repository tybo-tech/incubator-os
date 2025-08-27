<?php
include_once '../../config/Database.php';
include_once '../../models/Categories.php';
include_once '../../config/headers.php';

$client_id = $_GET['client_id'] ?? null;

try {
    $database = new Database();
    $db = $database->connect();
    $categories = new Categories($db);

    if ($client_id) {
        $result = $categories->listCompaniesUnderClient((int)$client_id);
        echo json_encode($result);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'client_id parameter required']);
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
