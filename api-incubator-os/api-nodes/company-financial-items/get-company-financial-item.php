<?php
include_once '../../config/Database.php';
include_once '../../models/CompanyFinancialItems.php';

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($id <= 0) {
    echo json_encode(['error' => 'Valid ID is required']);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $financialItem = new CompanyFinancialItems($db);

    $result = $financialItem->getById($id);

    if ($result) {
        echo json_encode($result);
    } else {
        echo json_encode(['error' => 'Financial item not found']);
    }
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
