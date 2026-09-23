<?php
declare(strict_types=1);

/**
 * GET Sessions for a company (timeline).
 *
 * Required: company_id. Optional: status, session_type, facilitator_user_id, search.
 * The actor is resolved from the session; company access is enforced in the query.
 */

include_once __DIR__ . '/../_bootstrap.php';

$companyId = (int)($_GET['company_id'] ?? 0);

try {
    $db = (new Database())->connect();
    $actor = auth_require_user($db);
    $policy = new SessionAccessPolicy($actor);

    $result = (new ListCompanySessions(
        new SessionRepository($db),
        $policy,
    ))->execute(
        companyId: $companyId,
        status: isset($_GET['status']) && $_GET['status'] !== '' ? (string)$_GET['status'] : null,
        sessionType: isset($_GET['session_type']) && $_GET['session_type'] !== '' ? (string)$_GET['session_type'] : null,
        facilitatorUserId: isset($_GET['facilitator_user_id']) && $_GET['facilitator_user_id'] !== '' ? (int)$_GET['facilitator_user_id'] : null,
        search: isset($_GET['search']) && $_GET['search'] !== '' ? (string)$_GET['search'] : null,
    );

    echo json_encode($result);
} catch (Throwable $e) {
    SessionErrorResponder::respond($e);
}
