<?php
include_once '../../config/Database.php';
include_once '../../models/CompanyFinancialItems.php';

$type = isset($_GET['type']) ? $_GET['type'] : null;
$companyId = isset($_GET['company_id']) ? (int)$_GET['company_id'] : null;
$year = isset($_GET['year']) ? (int)$_GET['year'] : null;

if (!$type) {
    echo json_encode(['error' => 'Valid type is required (direct_cost, operational_cost, asset, liability, equity)']);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $financialItem = new CompanyFinancialItems($db);

    $result = $financialItem->listByType($type, $companyId, $year);
    echo json_encode($result);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
