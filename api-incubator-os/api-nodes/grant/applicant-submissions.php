<?php
/**
 * GET /api-nodes/grant/applicant-submissions.php?applicant_id=123
 *
 * Returns all form submissions (interviews / dynamic forms) for a grant applicant.
 * Resolves the effective company_id the same way the Angular front-end does:
 *   effectiveCompanyId = applicant.company_id ?? applicant.id
 *
 * Required query param:
 *   applicant_id  – the grant_application node id
 *
 * Response:
 * {
 *   applicant_id, company_id, company_name, total,
 *   submissions: [
 *     {
 *       id, parent_id, form_template_id, form_template_name,
 *       status, submitted_at, answers, meta, created_at
 *     }
 *   ]
 * }
 */

include_once '../../config/Database.php';
include_once '../../config/headers.php';
include_once '../../models/GrantReports.php';

$applicantId = isset($_GET['applicant_id']) ? (int)$_GET['applicant_id'] : null;

try {
    if (!$applicantId) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required parameter: applicant_id']);
        exit;
    }

    $database = new Database();
    $db       = $database->connect();
    $reports  = new GrantReports($db);

    $result = $reports->getApplicantFormSubmissions($applicantId);

    echo json_encode($result);
} catch (RuntimeException $e) {
    http_response_code(404);
    echo json_encode(['error' => $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
