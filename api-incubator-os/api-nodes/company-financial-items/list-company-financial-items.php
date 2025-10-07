<?php
include_once '../../config/Database.php';
include_once '../../models/CompanyFinancialItems.php';

$companyId = isset($_GET['company_id']) ? (int)$_GET['company_id'] : 0;
$type = isset($_GET['type']) ? $_GET['type'] : null;
$year = isset($_GET['year']) ? (int)$_GET['year'] : null;

if ($companyId <= 0) {
    echo json_encode(['error' => 'Valid company_id is required']);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $financialItem = new CompanyFinancialItems($db);

    $result = $financialItem->listByCompany($companyId, $type, $year);
    echo json_encode($result);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
