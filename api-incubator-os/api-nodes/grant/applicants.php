<?php
/**
 * GET /api-nodes/grant/applicants.php
 *
 * Returns all grant applicants with aggregated bank-statement statistics.
 *
 * Query params (all optional):
 *   workflow_id  – filter by workflow, e.g. "grant-2026"
 *   status       – filter by current stage key, e.g. "applied"
 *   province     – filter by province name
 *
 * Response: JSON array of applicant objects, each containing:
 *   id, company_name, status, province, workflow_id, fy_count,
 *   grand_total, active_months, captured_months,
 *   avg_per_active_month, consistency_rate, consistency_label, consistency_note
 */

include_once '../../config/Database.php';
include_once '../../config/headers.php';
include_once '../../models/GrantReports.php';

$workflowId = $_GET['workflow_id'] ?? null;
$status     = $_GET['status']      ?? null;
$province   = $_GET['province']    ?? null;

try {
    $database = new Database();
    $db       = $database->connect();
    $reports  = new GrantReports($db);

    $result = $reports->getApplicantsCollection($workflowId, $status, $province);

    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
