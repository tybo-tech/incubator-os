<?php
declare(strict_types=1);

/**
 * GET the site-visit report for a `site_visit` Session (`?id=`).
 *
 * Returns the empty draft shape when no report row exists yet. This endpoint
 * never returns `incubator`-visibility notes — the report has its own sections
 * and the snapshot builder never reads session_notes at all.
 */

include_once __DIR__ . '/../_bootstrap.php';

$id = (int)($_GET['id'] ?? 0);

try {
    if ($id <= 0) {
        http_response_code(422);
        echo json_encode(['error' => 'id is required']);
        exit;
    }

    $db = (new Database())->connect();
    $actor = auth_require_user($db);

    $result = (new GetVisitReport(
        sessions_visit_service($db, $actor),
    ))->execute($id);

    echo json_encode($result);
} catch (Throwable $e) {
    SessionErrorResponder::respond($e);
}
