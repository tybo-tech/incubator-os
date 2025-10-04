<?php
include_once '../../config/Database.php';
include_once '../../models/IndustryReports.php';

try {
    $database = new Database();
    $db = $database->connect();
    $reports = new IndustryReports($db);

    // Get all report data
    $companiesPerIndustry = $reports->companiesPerIndustry();
    $financialByIndustry = $reports->financialByIndustry();
    $employmentByIndustry = $reports->employmentByIndustry();
    $diversityByIndustry = $reports->diversityByIndustry();
    $topIndustries = $reports->topIndustries(10);

    // Calculate totals for overview stats
    $totalCompanies = array_sum(array_column($companiesPerIndustry, 'total_companies'));
    $totalTurnover = array_sum(array_column($financialByIndustry, 'total_turnover'));
    $totalEmployees = array_sum(array_column($employmentByIndustry, 'total_employees'));
    $totalIndustries = count($companiesPerIndustry);

    // Calculate diversity totals
    $totalYouthOwned = array_sum(array_column($diversityByIndustry, 'youth_owned'));
    $totalBlackOwned = array_sum(array_column($diversityByIndustry, 'black_owned'));
    $totalWomenOwned = array_sum(array_column($diversityByIndustry, 'women_owned'));

    // Overview statistics
    $overview = [
        'total_companies' => $totalCompanies,
        'total_industries' => $totalIndustries,
        'total_turnover' => $totalTurnover,
        'avg_turnover_per_company' => $totalCompanies > 0 ? round($totalTurnover / $totalCompanies, 2) : 0,
        'total_employees' => $totalEmployees,
        'avg_employees_per_company' => $totalCompanies > 0 ? round($totalEmployees / $totalCompanies, 2) : 0,
        'diversity_stats' => [
            'youth_owned' => $totalYouthOwned,
            'black_owned' => $totalBlackOwned,
            'women_owned' => $totalWomenOwned,
            'youth_percentage' => $totalCompanies > 0 ? round(($totalYouthOwned / $totalCompanies) * 100, 1) : 0,
            'black_percentage' => $totalCompanies > 0 ? round(($totalBlackOwned / $totalCompanies) * 100, 1) : 0,
            'women_percentage' => $totalCompanies > 0 ? round(($totalWomenOwned / $totalCompanies) * 100, 1) : 0
        ]
    ];

    echo json_encode([
        'overview' => $overview,
        'companies_per_industry' => $companiesPerIndustry,
        'financial_by_industry' => $financialByIndustry,
        'employment_by_industry' => $employmentByIndustry,
        'diversity_by_industry' => $diversityByIndustry,
        'top_industries' => $topIndustries
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
