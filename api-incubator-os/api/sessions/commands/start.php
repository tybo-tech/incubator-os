<?php
declare(strict_types=1);

/**
 * POST start a Session (PREPARING -> IN_PROGRESS). `?id=`.
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

    $version = isset($input['version']) && $input['version'] !== '' ? (int)$input['version'] : null;

    $result = (new StartSession(
        new SessionRepository($db),
        new SessionAccessPolicy($actor),
        new TransactionManager($db),
    ))->execute($id, $version);

    echo json_encode($result);
} catch (Throwable $e) {
    SessionErrorResponder::respond($e);
}
