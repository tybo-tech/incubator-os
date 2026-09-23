<?php
declare(strict_types=1);

/**
 * GET one Session (full detail).
 *
 * `?id=` identifies the Session. Incubator-only notes are stripped for a company
 * user inside the query, so they can never leak through this endpoint.
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

    $result = (new GetSession(
        new SessionRepository($db),
        new SessionAccessPolicy($actor),
    ))->execute($id);

    echo json_encode($result);
} catch (Throwable $e) {
    SessionErrorResponder::respond($e);
}
