<?php
include_once '../../config/Database.php';
include_once '../../models/CompanyFinancialYearlyStats.php';

try {
    $database = new Database();
    $db = $database->connect();
    $model = new CompanyFinancialYearlyStats($db);

    // Get query parameters
    $type = $_GET['type'] ?? 'summary';
    $limit = min(50, max(1, (int)($_GET['limit'] ?? 10)));
    $financialYearId = isset($_GET['financial_year_id']) ? (int)$_GET['financial_year_id'] : null;

    $result = [];

    switch ($type) {
        case 'top_revenue':
            $result = [
                'type' => 'top_revenue_companies',
                'data' => $model->getTopRevenueCompanies($limit, $financialYearId),
                'title' => 'Top Revenue Companies',
                'subtitle' => 'Highest performing companies by total revenue'
            ];
            break;

        case 'max_revenue':
            $maxRecord = $model->getMaxRevenueRecord();
            $result = [
                'type' => 'max_revenue_record',
                'data' => $maxRecord,
                'title' => 'Highest Revenue Record',
                'subtitle' => $maxRecord ? 'Single highest revenue entry in the system' : 'No revenue records found'
            ];
            break;

        case 'recent_high_value':
            $result = [
                'type' => 'recent_high_value_updates',
                'data' => $model->getRecentHighValueUpdates($limit),
                'title' => 'Recent High-Value Updates',
                'subtitle' => 'Latest financial entries with significant amounts'
            ];
            break;

        case 'monthly_summary':
            $summary = $model->getMonthlyPerformanceSummary($financialYearId);
            $result = [
                'type' => 'monthly_performance_summary',
                'data' => $summary,
                'title' => 'Performance Summary',
                'subtitle' => 'Overall financial performance metrics'
            ];
            break;

        case 'active_companies':
            $result = [
                'type' => 'companies_with_recent_activity',
                'data' => $model->getCompaniesWithRecentActivity(30),
                'title' => 'Recently Active Companies',
                'subtitle' => 'Companies with financial activity in the last 30 days'
            ];
            break;

        case 'summary':
        default:
            // Return a comprehensive dashboard summary
            $result = [
                'type' => 'dashboard_summary',
                'data' => [
                    'performance_summary' => $model->getMonthlyPerformanceSummary($financialYearId),
                    'top_companies' => $model->getTopRevenueCompanies(5, $financialYearId),
                    'max_revenue' => $model->getMaxRevenueRecord(),
                    'recent_activity' => $model->getCompaniesWithRecentActivity(30)
                ],
                'title' => 'Financial Dashboard Summary',
                'subtitle' => 'Comprehensive overview of financial performance'
            ];
            break;
    }

    echo json_encode([
        'success' => true,
        'result' => $result,
        'metadata' => [
            'generated_at' => date('Y-m-d H:i:s'),
            'financial_year_id' => $financialYearId,
            'limit' => $limit
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}
?>