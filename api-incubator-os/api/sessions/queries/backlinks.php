<?php
declare(strict_types=1);

/**
 * GET Sessions that link a given business record (backlinks).
 *
 * Required: entity_type, entity_id. Results are filtered to the companies the
 * viewer can access, so a backlink never discloses a Session they cannot see.
 */

include_once __DIR__ . '/../_bootstrap.php';

$entityType = trim((string)($_GET['entity_type'] ?? ''));
$entityId = (int)($_GET['entity_id'] ?? 0);

try {
    $db = (new Database())->connect();
    $actor = auth_require_user($db);

    $result = (new ListSessionBacklinks(
        new SessionRepository($db),
        new SessionAccessPolicy($actor),
    ))->execute($entityType, $entityId);

    echo json_encode($result);
} catch (Throwable $e) {
    SessionErrorResponder::respond($e);
}
