<?php
include_once '../../config/Database.php';
include_once '../../models/CompanyRevenueSummary.php';

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($id <= 0) {
    echo json_encode(['error' => 'Valid ID is required']);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $revenueSummary = new CompanyRevenueSummary($db);

    $result = $revenueSummary->getById($id);

    if ($result) {
        echo json_encode($result);
    } else {
        echo json_encode(['error' => 'Revenue summary not found']);
    }
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
