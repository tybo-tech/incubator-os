<?php

include_once '../../../config/Database.php';
include_once '../../../config/headers.php';
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

$token = $input['token'] ?? basename(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

try {
    $db = (new Database())->connect();
    $repo = new FinancialIndicatorRepository($db);
    $linkRepo = new FinancialIndicatorLinkRepository($db);
    $calc = new FinancialIndicatorCalculator();
    $request = new PublicSubmitRequest(
        token: $token,
        data: $input['data'] ?? [],
    );
    $result = (new PublicSubmit($repo, $linkRepo, $calc, new TransactionManager($db)))->execute($request);
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
