<?php
include_once '../../config/Database.php';
include_once '../../models/CompanyProfitSummary.php';

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($id <= 0) {
    echo json_encode(['error' => 'Valid ID is required']);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $profitSummary = new CompanyProfitSummary($db);

    $result = $profitSummary->getById($id);

    if ($result) {
        echo json_encode($result);
    } else {
        echo json_encode(['error' => 'Profit summary not found']);
    }
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
