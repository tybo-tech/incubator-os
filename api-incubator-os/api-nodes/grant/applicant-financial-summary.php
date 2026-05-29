<?php
/**
 * GET /api-nodes/grant/applicant-financial-summary.php?id=123
 *
 * Returns a detailed financial breakdown for a single grant applicant.
 *
 * Required query param:
 *   id  – the applicant node id
 *
 * Response:
 * {
 *   applicant_id, company_name, status, province, workflow_id,
 *   grand_total, active_months, captured_months,
 *   avg_per_active_month,
 *   consistency_rate, consistency_label, consistency_note,
 *   fy_count,
 *   fy_rows: [
 *     {
 *       node_id, financial_year_id, financial_year_name,
 *       months: { m1..m12 },
 *       total, active_months, captured_months,
 *       avg_per_active_month, consistency_rate, consistency_label
 *     }
 *   ]
 * }
 */

include_once '../../config/Database.php';
include_once '../../config/headers.php';
include_once '../../models/GrantReports.php';

$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

try {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required parameter: id']);
        exit;
    }

    $database = new Database();
    $db       = $database->connect();
    $reports  = new GrantReports($db);

    $result = $reports->getApplicantFinancialSummary($id);

    echo json_encode($result);
} catch (RuntimeException $e) {
    http_response_code(404);
    echo json_encode(['error' => $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
