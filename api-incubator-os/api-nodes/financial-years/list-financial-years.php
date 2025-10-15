<?php
include_once '../../config/Database.php';
include_once '../../models/FinancialYears.php';
include_once '../../config/headers.php';

try {
    $database = new Database();
    $db = $database->connect();
    $financialYears = new FinancialYears($db);

    $result = $financialYears->listAll();
    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}