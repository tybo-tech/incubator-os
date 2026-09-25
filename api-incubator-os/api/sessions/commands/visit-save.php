<?php
declare(strict_types=1);

/**
 * POST upsert the draft visit-report header (`?id=` Session, `?action=save`).
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

    $result = (new SaveVisitReport(
        sessions_visit_service($db, $actor),
        new TransactionManager($db),
    ))->execute($id, $input);

    echo json_encode($result);
} catch (Throwable $e) {
    SessionErrorResponder::respond($e);
}
