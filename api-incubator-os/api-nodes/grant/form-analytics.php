<?php
/**
 * GET /api-nodes/grant/form-analytics.php
 *
 * Aggregates form / interview submission data across all applicants in a
 * workflow.  For every workflow stage that references a form_template, this
 * endpoint pulls all submissions and returns a breakdown of each reportable
 * question (boolean → Yes/No counts, select → per-option counts,
 * number → min/max/avg/sum).  Free-text fields are intentionally excluded.
 *
 * Query params:
 *   workflow_id  – required, e.g. "grant-2026"
 *
 * Response shape:
 * {
 *   workflow_id:      string,
 *   workflow_name:    string,
 *   total_applicants: number,
 *   stage_count:      number,
 *   stages: [
 *     {
 *       stage_key, stage_label, stage_type, stage_color,
 *       template_id, template_name,
 *       total_submissions, submitted_count, draft_count,
 *       sections: [
 *         {
 *           id, title,
 *           questions: [
 *             { id, label, type, total_answered, total_possible,
 *               breakdown: { [value]: count },
 *               options?: string[],          // select only
 *               stats?: { min, max, avg, sum } // number only
 *             }
 *           ]
 *         }
 *       ]
 *     }
 *   ]
 * }
 */

include_once '../../config/Database.php';
include_once '../../config/headers.php';
include_once '../../models/GrantReports.php';

$workflowId = isset($_GET['workflow_id']) ? trim($_GET['workflow_id']) : null;

if (!$workflowId) {
    http_response_code(400);
    echo json_encode(['error' => 'workflow_id is required']);
    exit;
}

try {
    $database = new Database();
    $db       = $database->connect();
    $reports  = new GrantReports($db);

    $result = $reports->getFormAnalytics($workflowId);

    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
