<?php
include_once '../../config/Database.php';
include_once '../../models/FinancialCategories.php';

$itemType = isset($_GET['item_type']) ? $_GET['item_type'] : null;
$onlyActive = isset($_GET['only_active']) ? (bool)$_GET['only_active'] : false;

try {
    $database = new Database();
    $db = $database->connect();
    $category = new FinancialCategories($db);

    $result = $category->listAll($itemType, $onlyActive);
    echo json_encode($result);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}