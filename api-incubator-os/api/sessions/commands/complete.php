<?php
declare(strict_types=1);

/**
 * POST complete a Session (IN_PROGRESS -> COMPLETED). `?id=`.
 * Optional body: closingSummary, version.
 */

include_once __DIR__ . '/../_bootstrap.php';

$id = (int)($_GET['id'] ?? 0);
$input = sessions_json_body();

try {
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'id is required']);
        exit;
    }

    $db = (new Database())->connect();
    $actor = auth_require_user($db);

    $closing = isset($input['closingSummary']) ? (string)$input['closingSummary'] : (isset($input['closing_summary']) ? (string)$input['closing_summary'] : null);
    $version = isset($input['version']) && $input['version'] !== '' ? (int)$input['version'] : null;

    $result = (new CompleteSession(
        new SessionRepository($db),
        new SessionAccessPolicy($actor),
        new TransactionManager($db),
    ))->execute($id, $closing, $version);

    echo json_encode($result);
} catch (Throwable $e) {
    SessionErrorResponder::respond($e);
}
