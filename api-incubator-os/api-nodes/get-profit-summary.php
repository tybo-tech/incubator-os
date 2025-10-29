<?php
declare(strict_types=1);
require_once '../config/Database.php';
require_once '../models/CompanyFinancialYearlyStats.php';
require_once '../models/CompanyCostingYearlyStats.php';

try {
    $database = new Database();
    $pdo = $database->connect();
    $revenueModel = new CompanyFinancialYearlyStats($pdo);
    $costingModel = new CompanyCostingYearlyStats($pdo);

    $companyId = (int)($_GET['company_id'] ?? 0);
    $financialYearId = isset($_GET['financial_year_id']) ? (int)$_GET['financial_year_id'] : null;

    if (!$companyId) {
        http_response_code(400);
        echo json_encode(['error' => 'Company ID is required']);
        exit;
    }

    if ($financialYearId) {
        // Get revenue data (quarterly)
        $revenueData = $revenueModel->getQuarterlyRevenue($companyId, $financialYearId);
        
        // Get cost data (quarterly) from new costing structure
        $costData = $costingModel->getQuarterlyCosts($companyId, $financialYearId);

        // Calculate profit = revenue - costs
        $profitSummary = [
            'company_id' => $companyId,
            'financial_year_id' => $financialYearId,
            'financial_year_name' => $revenueData['financial_year_name'] ?? $costData['financial_year_name'] ?? "FY $financialYearId",
            'fy_start_year' => $revenueData['fy_start_year'] ?? $costData['fy_start_year'] ?? null,
            'fy_end_year' => $revenueData['fy_end_year'] ?? $costData['fy_end_year'] ?? null,
            'start_month' => $revenueData['start_month'] ?? $costData['start_month'] ?? 1,
            
            // Revenue breakdown
            'revenue_q1' => $revenueData['revenue_q1'] ?? 0,
            'revenue_q2' => $revenueData['revenue_q2'] ?? 0,
            'revenue_q3' => $revenueData['revenue_q3'] ?? 0,
            'revenue_q4' => $revenueData['revenue_q4'] ?? 0,
            'revenue_total' => $revenueData['revenue_total'] ?? 0,
            
            // Cost breakdown (from new costing table)
            'direct_costs_q1' => $costData['direct_q1'] ?? 0,
            'direct_costs_q2' => $costData['direct_q2'] ?? 0,
            'direct_costs_q3' => $costData['direct_q3'] ?? 0,
            'direct_costs_q4' => $costData['direct_q4'] ?? 0,
            'direct_costs_total' => $costData['direct_total'] ?? 0,
            
            'operational_costs_q1' => $costData['operational_q1'] ?? 0,
            'operational_costs_q2' => $costData['operational_q2'] ?? 0,
            'operational_costs_q3' => $costData['operational_q3'] ?? 0,
            'operational_costs_q4' => $costData['operational_q4'] ?? 0,
            'operational_costs_total' => $costData['operational_total'] ?? 0,
            
            'total_costs_q1' => $costData['total_costs_q1'] ?? 0,
            'total_costs_q2' => $costData['total_costs_q2'] ?? 0,
            'total_costs_q3' => $costData['total_costs_q3'] ?? 0,
            'total_costs_q4' => $costData['total_costs_q4'] ?? 0,
            'total_costs' => $costData['total_costs'] ?? 0,
            
            // Profit calculation = Revenue - Total Costs
            'profit_q1' => round(($revenueData['revenue_q1'] ?? 0) - ($costData['total_costs_q1'] ?? 0), 2),
            'profit_q2' => round(($revenueData['revenue_q2'] ?? 0) - ($costData['total_costs_q2'] ?? 0), 2),
            'profit_q3' => round(($revenueData['revenue_q3'] ?? 0) - ($costData['total_costs_q3'] ?? 0), 2),
            'profit_q4' => round(($revenueData['revenue_q4'] ?? 0) - ($costData['total_costs_q4'] ?? 0), 2),
            'profit_total' => round(($revenueData['revenue_total'] ?? 0) - ($costData['total_costs'] ?? 0), 2),
            
            // Profit margins (%)
            'profit_margin_q1' => ($revenueData['revenue_q1'] ?? 0) > 0 
                ? round((($revenueData['revenue_q1'] - ($costData['total_costs_q1'] ?? 0)) / $revenueData['revenue_q1']) * 100, 2)
                : 0,
            'profit_margin_q2' => ($revenueData['revenue_q2'] ?? 0) > 0 
                ? round((($revenueData['revenue_q2'] - ($costData['total_costs_q2'] ?? 0)) / $revenueData['revenue_q2']) * 100, 2)
                : 0,
            'profit_margin_q3' => ($revenueData['revenue_q3'] ?? 0) > 0 
                ? round((($revenueData['revenue_q3'] - ($costData['total_costs_q3'] ?? 0)) / $revenueData['revenue_q3']) * 100, 2)
                : 0,
            'profit_margin_q4' => ($revenueData['revenue_q4'] ?? 0) > 0 
                ? round((($revenueData['revenue_q4'] - ($costData['total_costs_q4'] ?? 0)) / $revenueData['revenue_q4']) * 100, 2)
                : 0,
            'profit_margin_total' => ($revenueData['revenue_total'] ?? 0) > 0 
                ? round((($revenueData['revenue_total'] - ($costData['total_costs'] ?? 0)) / $revenueData['revenue_total']) * 100, 2)
                : 0,
            
            // Export data (if available)
            'export_q1' => $revenueData['export_q1'] ?? 0,
            'export_q2' => $revenueData['export_q2'] ?? 0,
            'export_q3' => $revenueData['export_q3'] ?? 0,
            'export_q4' => $revenueData['export_q4'] ?? 0,
            'export_total' => $revenueData['export_total'] ?? 0,
            'export_ratio' => $revenueData['export_ratio'] ?? 0,
            
            // Quarter details for reference
            'quarter_details' => $revenueData['quarter_details'] ?? $costData['quarter_details'] ?? null
        ];

        echo json_encode($profitSummary);
    } else {
        // Get profit summaries for all years
        // Get all financial years for this company from revenue data
        $revenueYears = $revenueModel->getQuarterlyRevenueAllYears($companyId);
        
        $results = [];
        foreach ($revenueYears as $revenueData) {
            $yearId = $revenueData['financial_year_id'];
            
            // Get corresponding cost data
            $costData = $costingModel->getQuarterlyCosts($companyId, $yearId);
            
            // Calculate profit summary for this year
            $profitSummary = [
                'company_id' => $companyId,
                'financial_year_id' => $yearId,
                'financial_year_name' => $revenueData['financial_year_name'],
                'fy_start_year' => $revenueData['fy_start_year'],
                'fy_end_year' => $revenueData['fy_end_year'],
                
                // Revenue
                'revenue_total' => $revenueData['revenue_total'] ?? 0,
                
                // Costs breakdown
                'direct_costs' => $costData['direct_total'] ?? 0,
                'operational_costs' => $costData['operational_total'] ?? 0,
                'total_costs' => $costData['total_costs'] ?? 0,
                
                // Gross Profit = Revenue - Direct Costs
                'gross_profit' => round(($revenueData['revenue_total'] ?? 0) - ($costData['direct_total'] ?? 0), 2),
                
                // Operating Profit = Revenue - Total Costs
                'operating_profit' => round(($revenueData['revenue_total'] ?? 0) - ($costData['total_costs'] ?? 0), 2),
                
                // Gross Margin % = (Gross Profit / Revenue) * 100
                'gross_margin' => ($revenueData['revenue_total'] ?? 0) > 0 
                    ? round((($revenueData['revenue_total'] - ($costData['direct_total'] ?? 0)) / $revenueData['revenue_total']) * 100, 2)
                    : 0,
                
                // Operating Margin % = (Operating Profit / Revenue) * 100
                'operating_margin' => ($revenueData['revenue_total'] ?? 0) > 0 
                    ? round((($revenueData['revenue_total'] - ($costData['total_costs'] ?? 0)) / $revenueData['revenue_total']) * 100, 2)
                    : 0,
                
                // Quarter details
                'quarter_details' => $revenueData['quarter_details'] ?? null
            ];
            
            $results[] = $profitSummary;
        }
        
        echo json_encode($results);
    }

} catch (Exception $e) {
    error_log("Profit Summary API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal server error',
        'message' => $e->getMessage(),
        'debug_info' => [
            'company_id' => $companyId ?? null,
            'financial_year_id' => $financialYearId ?? null
        ]
    ]);
}
