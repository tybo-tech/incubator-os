<?php
include_once '../../config/Database.php';
include_once '../../models/CohortReports.php';
include_once '../../config/headers.php';

$clientId = isset($_GET['client_id']) ? (int)$_GET['client_id'] : null;
$programId = isset($_GET['program_id']) ? (int)$_GET['program_id'] : null;
$cohortId = isset($_GET['cohort_id']) ? (int)$_GET['cohort_id'] : null;

try {
    $database = new Database();
    $db = $database->connect();
    $reports = new CohortReports($db);

    $dashboard = [
        'summary' => $reports->overallSummary(),
        'cohort_performance' => $reports->cohortPerformanceMetrics($cohortId),
        'compliance_summary' => $reports->complianceSummaryByCohort($cohortId),
        'financial_metrics' => $reports->financialMetricsByCohort($cohortId),
        'industry_distribution' => $reports->industryDistribution(),
        'geographic_distribution' => $reports->geographicDistribution($cohortId),
        'timeline_analytics' => $reports->cohortTimelineAnalytics(),
        'companies_per_program' => $reports->companiesPerProgram(),
        'companies_per_cohort' => $reports->companiesPerCohort(),
        'active_companies_by_client' => $reports->activeCompaniesByClient()
    ];

    // Add metadata
    $dashboard['metadata'] = [
        'generated_at' => date('Y-m-d H:i:s'),
        'filters' => [
            'client_id' => $clientId,
            'program_id' => $programId,
            'cohort_id' => $cohortId
        ]
    ];

    echo json_encode($dashboard);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
