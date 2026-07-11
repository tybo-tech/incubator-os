<?php

include_once '../../../config/Database.php';
include_once '../../../capabilities/financial-indicators/Services/FinancialIndicatorCalculator.php';
include_once '../../../capabilities/financial-indicators/Repository/FinancialIndicatorRepository.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        exit;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || !isset($input['records']) || !is_array($input['records'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Request must contain a "records" array']);
        exit;
    }

    $db = (new Database())->connect();
    $repo = new FinancialIndicatorRepository($db);
    $calc = new FinancialIndicatorCalculator();

    $inserted = 0;
    $skipped = 0;
    $errors = [];

    foreach ($input['records'] as $idx => $record) {
        $rowNum = $idx + 1;
        $companyId = (int)($record['companyId'] ?? 0);
        $data = $record['data'] ?? [];
        $meta = $data['meta'] ?? [];
        $income = $data['income_statement'] ?? [];
        $balance = $data['balance_sheet'] ?? [];

        $financialYear = (int)($meta['financial_year'] ?? 0);
        $month = (int)($meta['month'] ?? 0);

        if (!$companyId || !$financialYear || !$month) {
            $errors[] = "Record $rowNum: missing companyId, financial_year, or month";
            $skipped++;
            continue;
        }

        $sales = (float)($income['sales'] ?? 0);
        $costOfSales = (float)($income['cost_of_sales'] ?? 0);
        $operatingExpenses = (float)($income['operating_expenses'] ?? 0);

        if ($sales < 0 || $costOfSales < 0 || $operatingExpenses < 0) {
            $errors[] = "Record $rowNum: negative values not allowed";
            $skipped++;
            continue;
        }

        $existing = $repo->findByMonth($companyId, $financialYear, $month);
        if ($existing) {
            $skipped++;
            continue;
        }

        try {
            $repo->create($companyId, $data);
            $inserted++;
        } catch (Exception $e) {
            $errors[] = "Record $rowNum: " . $e->getMessage();
            $skipped++;
        }
    }

    $message = "$inserted records imported";
    if ($skipped > 0) {
        $message .= ", $skipped skipped";
    }
    if (!empty($errors)) {
        $message .= ", " . count($errors) . " errors";
    }

    echo json_encode([
        'success' => true,
        'message' => $message,
        'inserted' => $inserted,
        'skipped' => $skipped,
        'errors' => $errors,
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage(), 'errors' => []]);
}
