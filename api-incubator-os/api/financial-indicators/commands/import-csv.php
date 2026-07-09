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

    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'File upload failed']);
        exit;
    }

    $companyId = (int)($_POST['company_id'] ?? 0);
    if (!$companyId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'company_id is required']);
        exit;
    }

    $file = $_FILES['file'];
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if ($ext !== 'csv') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Only CSV files are accepted']);
        exit;
    }

    $handle = fopen($file['tmp_name'], 'r');
    if (!$handle) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Could not read uploaded file']);
        exit;
    }

    // Read header row
    $header = fgetcsv($handle);
    if (!$header) {
        fclose($handle);
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'CSV file is empty or has no header row']);
        exit;
    }

    $header = array_map('trim', $header);
    $expectedHeaders = [
        'company_id', 'financial_year', 'month', 'sales', 'cost_of_sales',
        'operating_expenses', 'cash', 'cash_equivalents', 'short_term_investments',
        'current_receivables', 'total_current_assets', 'total_assets',
        'total_current_liabilities', 'total_liabilities', 'total_equity'
    ];

    // Validate headers
    $missingHeaders = array_diff($expectedHeaders, $header);
    if (!empty($missingHeaders)) {
        fclose($handle);
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Missing columns: ' . implode(', ', $missingHeaders),
            'errors' => []
        ]);
        exit;
    }

    $db = (new Database())->connect();
    $repo = new FinancialIndicatorRepository($db);
    $calc = new FinancialIndicatorCalculator();

    $inserted = 0;
    $skipped = 0;
    $errors = [];
    $rowNum = 1;

    while (($row = fgetcsv($handle)) !== false) {
        $rowNum++;
        $data = array_combine($header, $row);

        $rowCompanyId = (int)($data['company_id'] ?? 0);
        $financialYear = (int)($data['financial_year'] ?? 0);
        $month = (int)($data['month'] ?? 0);

        if (!$rowCompanyId || !$financialYear || !$month) {
            $skipped++;
            continue;
        }

        $sales = (float)($data['sales'] ?? 0);
        $costOfSales = (float)($data['cost_of_sales'] ?? 0);
        $operatingExpenses = (float)($data['operating_expenses'] ?? 0);

        if ($sales < 0 || $costOfSales < 0 || $operatingExpenses < 0) {
            $errors[] = "Row $rowNum: Negative values not allowed";
            $skipped++;
            continue;
        }

        // Check for duplicate month
        $existing = $repo->findByMonth($rowCompanyId, $financialYear, $month);
        if ($existing) {
            $skipped++;
            continue;
        }

        $nodeData = [
            'meta' => [
                'financial_year' => $financialYear,
                'month' => $month,
                'currency' => 'ZAR',
                'report_type' => 'Monthly Management Accounts',
            ],
            'income_statement' => [
                'sales' => $sales,
                'cost_of_sales' => $costOfSales,
                'operating_expenses' => $operatingExpenses,
            ],
            'balance_sheet' => [
                'cash' => (float)($data['cash'] ?? 0),
                'cash_equivalents' => (float)($data['cash_equivalents'] ?? 0),
                'short_term_investments' => (float)($data['short_term_investments'] ?? 0),
                'current_receivables' => (float)($data['current_receivables'] ?? 0),
                'total_current_assets' => (float)($data['total_current_assets'] ?? 0),
                'total_assets' => (float)($data['total_assets'] ?? 0),
                'total_current_liabilities' => (float)($data['total_current_liabilities'] ?? 0),
                'total_liabilities' => (float)($data['total_liabilities'] ?? 0),
                'total_equity' => (float)($data['total_equity'] ?? 0),
            ],
        ];

        try {
            $repo->create($rowCompanyId, $nodeData);
            $inserted++;
        } catch (Exception $e) {
            $errors[] = "Row $rowNum: " . $e->getMessage();
            $skipped++;
        }
    }

    fclose($handle);

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
