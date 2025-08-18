<?php
include_once '../../config/Database.php';
include_once '../../models/Company.php';

$filters = $_GET;
$limit = isset($filters['limit']) ? (int)$filters['limit'] : 50;
$offset = isset($filters['offset']) ? (int)$filters['offset'] : 0;

try {
    $database = new Database();
    $db = $database->connect();
    $company = new Company($db);

    $result = $company->search($filters, $limit, $offset);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
