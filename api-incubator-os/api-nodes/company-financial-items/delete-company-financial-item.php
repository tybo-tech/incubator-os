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

    $success = $financialItem->delete($id);
    
    if ($success) {
        echo json_encode(['success' => true, 'message' => 'Financial item deleted successfully']);
    } else {
        echo json_encode(['error' => 'Financial item not found or could not be deleted']);
    }
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}