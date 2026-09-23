<?php
declare(strict_types=1);

/**
 * GET company `meeting` calendar events eligible for conversion into a Session.
 *
 * Required: company_id, start, end. Excludes system-wide, non-meeting and
 * already-linked events.
 */

include_once __DIR__ . '/../_bootstrap.php';

$companyId = (int)($_GET['company_id'] ?? 0);
$start = trim((string)($_GET['start'] ?? ''));
$end = trim((string)($_GET['end'] ?? ''));

try {
    $db = (new Database())->connect();
    $actor = auth_require_user($db);
    $policy = new SessionAccessPolicy($actor);

    $result = (new ListEligibleEvents(
        new CalendarEventRepository($db),
        new SessionRepository($db),
        $policy,
        new CalendarValidator(),
    ))->execute($companyId, $start, $end);

    echo json_encode($result);
} catch (Throwable $e) {
    SessionErrorResponder::respond($e);
}
