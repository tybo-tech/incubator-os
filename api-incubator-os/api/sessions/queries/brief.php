<?php
declare(strict_types=1);

/**
 * GET the server-built preparation brief for a Session. Read-only.
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
    $repo = new SessionRepository($db);

    $result = (new GetSessionBrief(
        $repo,
        new SessionAccessPolicy($actor),
        new SessionBriefReadModel($db),
    ))->execute($id);

    echo json_encode($result);
} catch (Throwable $e) {
    SessionErrorResponder::respond($e);
}
