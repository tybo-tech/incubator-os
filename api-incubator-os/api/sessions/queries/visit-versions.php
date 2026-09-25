<?php
declare(strict_types=1);

/**
 * GET issued snapshot metadata for a site visit (`?id=`).
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

    $result = (new ListVisitVersions(
        sessions_visit_service($db, $actor),
    ))->execute($id);

    echo json_encode($result);
} catch (Throwable $e) {
    SessionErrorResponder::respond($e);
}
