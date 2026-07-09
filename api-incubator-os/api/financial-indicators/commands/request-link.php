<?php

include_once '../../../config/app.php';
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

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) { http_response_code(400); echo json_encode(['error' => 'Request body is required']); exit; }

$companyId = (int)($input['companyId'] ?? 0);
$financialYear = (int)($input['financialYear'] ?? 0);
$month = (int)($input['month'] ?? 0);

if (!$companyId) { http_response_code(400); echo json_encode(['error' => 'companyId is required']); exit; }
if (!$financialYear) { http_response_code(400); echo json_encode(['error' => 'financialYear is required']); exit; }
if (!$month || $month < 1 || $month > 12) { http_response_code(400); echo json_encode(['error' => 'month must be 1-12']); exit; }

try {
    $db = (new Database())->connect();
    $linkRepo = new FinancialIndicatorLinkRepository($db);
    $request = new RequestLinkRequest(
        companyId: $companyId,
        financialYear: $financialYear,
        month: $month,
    );
    $result = (new RequestLink($linkRepo, new TransactionManager($db)))->execute($request);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
