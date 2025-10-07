<?php
include_once '../../config/Database.php';
include_once '../../models/CompanyRevenueSummary.php';

$companyId = isset($_GET['company_id']) ? (int)$_GET['company_id'] : 0;

if ($companyId <= 0) {
    echo json_encode(['error' => 'Valid company_id is required']);
    exit;
}

try {
    $database = new Database();
    $db = $database->connect();
    $revenueSummary = new CompanyRevenueSummary($db);

    $result = $revenueSummary->listByCompany($companyId);
    echo json_encode($result);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}