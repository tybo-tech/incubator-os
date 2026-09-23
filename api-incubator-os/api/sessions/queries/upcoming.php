<?php
declare(strict_types=1);

/**
 * GET upcoming Sessions accessible to the actor.
 *
 * Required: start, end (YYYY-MM-DD). Optional: company_id.
 * Administrators see every company; everyone else only their own.
 */

include_once __DIR__ . '/../_bootstrap.php';

$start = trim((string)($_GET['start'] ?? ''));
$end = trim((string)($_GET['end'] ?? ''));

try {
    $db = (new Database())->connect();
    $actor = auth_require_user($db);

    $companyId = isset($_GET['company_id']) && $_GET['company_id'] !== '' ? (int)$_GET['company_id'] : null;

    $result = (new ListUpcomingSessions(
        new SessionRepository($db),
        new SessionAccessPolicy($actor),
        new CalendarValidator(),
    ))->execute($start, $end, $companyId);

    echo json_encode($result);
} catch (Throwable $e) {
    SessionErrorResponder::respond($e);
}
