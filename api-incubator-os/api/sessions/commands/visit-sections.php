<?php
declare(strict_types=1);

/**
 * POST manage one visit-report section (`?id=` Session, `?section=`, `?action=`).
 *
 * action: add | update | reorder | delete
 */

include_once __DIR__ . '/../_bootstrap.php';

$id = (int)($_GET['id'] ?? 0);
$action = sessions_require_action();
$section = trim((string)($_GET['section'] ?? ''));
$input = sessions_json_body();

try {
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'id is required']);
        exit;
    }
    if ($section === '') {
        http_response_code(422);
        echo json_encode(['error' => 'A section is required.', 'errors' => ['section' => 'A section is required.']]);
        exit;
    }

    $db = (new Database())->connect();
    $actor = auth_require_user($db);

    $result = (new ManageVisitSection(
        sessions_visit_service($db, $actor),
        new TransactionManager($db),
    ))->execute($id, $action, $section, $input);

    echo json_encode($result);
} catch (Throwable $e) {
    SessionErrorResponder::respond($e);
}
