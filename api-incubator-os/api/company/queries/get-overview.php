<?php

include_once '../../../config/Database.php';
include_once '../../../core/Infrastructure/TransactionManager.php';
include_once '../../../capabilities/company/Contracts/Responses/CommandResult.php';
include_once '../../../capabilities/company/Contracts/Responses/CompanyOverviewResponse.php';
include_once '../../../capabilities/company/Contracts/Projections/DirectorSummary.php';
include_once '../../../capabilities/company/Contracts/Projections/FinancialSummary.php';
include_once '../../../capabilities/company/Application/Queries/GetOverview.php';
include_once '../../../capabilities/company/Repository/CompanyRepository.php';
include_once '../../../capabilities/company/Repository/UserRepository.php';

$id = (int)($_GET['id'] ?? 0);
if (!$id) { http_response_code(400); echo json_encode(['error' => 'id is required']); exit; }

try {
    $db = (new Database())->connect();
    $result = (new GetOverview(
        new CompanyRepository($db),
        new UserRepository($db),
    ))->execute($id);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}