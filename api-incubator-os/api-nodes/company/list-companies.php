<?php
include_once '../../config/Database.php';
include_once '../../models/Company.php';

$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
$offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

try {
    $database = new Database();
    $db = $database->connect();
    $company = new Company($db);

    $result = $company->list($limit, $offset);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
