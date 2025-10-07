<?php
include_once '../../config/Database.php';
include_once '../../models/CompanyFinancialItems.php';

$companyId = isset($_GET['company_id']) ? (int)$_GET['company_id'] : 0;
$year = isset($_GET['year']) ? (int)$_GET['year'] : 0;

if ($companyId <= 0 || $year <= 0) {
    echo json_encode(['error' => 'Valid company_id and year are required']);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $financialItem = new CompanyFinancialItems($db);

    $result = $financialItem->getTotalsByType($companyId, $year);
    echo json_encode($result);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
