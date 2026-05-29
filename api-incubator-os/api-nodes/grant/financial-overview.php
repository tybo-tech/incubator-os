<?php
/**
 * GET /api-nodes/grant/financial-overview.php?workflow_id=grant-2026
 *
 * Cross-applicant financial leaderboard + aggregate pool statistics.
 * Only includes applicants who have at least one bank-statement month captured.
 * Applicants are ranked by grand_total (descending).
 *
 * Query params (all optional):
 *   workflow_id  – scope to a specific workflow, e.g. "grant-2026"
 *
 * Response:
 * {
 *   workflow_id,
 *   total_applicants,
 *   applicants_with_data,
 *   total_pool_value,
 *   overall_active_months,
 *   overall_captured_months,
 *   overall_avg_per_active_month,
 *   top_avg_per_month,
 *   applicants: [
 *     { rank, id, company_name, grand_total, avg_per_active_month,
 *       consistency_rate, consistency_label, active_months, captured_months }
 *   ]
 * }
 */

include_once '../../config/Database.php';
include_once '../../config/headers.php';
include_once '../../models/GrantReports.php';

$workflowId = $_GET['workflow_id'] ?? null;

try {
    $database = new Database();
    $db       = $database->connect();
    $reports  = new GrantReports($db);

    $result = $reports->getFinancialOverview($workflowId);

    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
