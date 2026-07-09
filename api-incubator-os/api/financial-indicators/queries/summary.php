<?php

include_once '../../../config/Database.php';
include_once '../../../core/Infrastructure/TransactionManager.php';
include_once '../../../capabilities/financial-indicators/Contracts/Responses/CommandResult.php';
include_once '../../../capabilities/financial-indicators/Contracts/Responses/FinancialIndicatorResponse.php';
include_once '../../../capabilities/financial-indicators/Contracts/Projections/FinancialIndicatorSummary.php';
include_once '../../../capabilities/financial-indicators/Contracts/Projections/AnnualMonthData.php';
include_once '../../../capabilities/financial-indicators/Contracts/Projections/AnnualReportResponse.php';
include_once '../../../capabilities/financial-indicators/Contracts/Projections/FinancialIndicatorSummaryResponse.php';
include_once '../../../capabilities/financial-indicators/Contracts/Requests/CreateIndicatorRequest.php';
include_once '../../../capabilities/financial-indicators/Contracts/Requests/UpdateIndicatorRequest.php';
include_once '../../../capabilities/financial-indicators/Contracts/Requests/DeleteIndicatorRequest.php';
include_once '../../../capabilities/financial-indicators/Contracts/Requests/RequestLinkRequest.php';
include_once '../../../capabilities/financial-indicators/Contracts/Requests/PublicSubmitRequest.php';
include_once '../../../capabilities/financial-indicators/Services/FinancialIndicatorCalculator.php';
include_once '../../../capabilities/financial-indicators/Repository/FinancialIndicatorRepository.php';
include_once '../../../capabilities/financial-indicators/Repository/FinancialIndicatorLinkRepository.php';
include_once '../../../capabilities/financial-indicators/Application/Commands/CreateIndicator.php';
include_once '../../../capabilities/financial-indicators/Application/Commands/UpdateIndicator.php';
include_once '../../../capabilities/financial-indicators/Application/Commands/DeleteIndicator.php';
include_once '../../../capabilities/financial-indicators/Application/Commands/RequestLink.php';
include_once '../../../capabilities/financial-indicators/Application/Commands/PublicSubmit.php';
include_once '../../../capabilities/financial-indicators/Application/Queries/GetIndicator.php';
include_once '../../../capabilities/financial-indicators/Application/Queries/ListByCompany.php';
include_once '../../../capabilities/financial-indicators/Application/Queries/GetAnnual.php';
include_once '../../../capabilities/financial-indicators/Application/Queries/GetSummary.php';

$companyId = (int)($_GET['companyId'] ?? 0);
if (!$companyId) { http_response_code(400); echo json_encode(['error' => 'companyId is required']); exit; }

try {
    $db = (new Database())->connect();
    $repo = new FinancialIndicatorRepository($db);
    $calc = new FinancialIndicatorCalculator();
    $result = (new GetSummary($repo, $calc))->execute($companyId);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
