<?php
declare(strict_types=1);

/**
 * POST manage Session participants and attendance.
 * `?id=` Session, `?action=` add|update|remove|attendance.
 */

include_once __DIR__ . '/../_bootstrap.php';

$id = (int)($_GET['id'] ?? 0);
$action = sessions_require_action();
$input = sessions_json_body();

try {
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'id is required']);
        exit;
    }

    $db = (new Database())->connect();
    $actor = auth_require_user($db);

    $result = (new ManageSessionParticipants(
        new SessionRepository($db),
        new SessionValidator(new CalendarValidator()),
        new SessionAccessPolicy($actor),
        new TransactionManager($db),
    ))->execute($id, $action, $input);

    echo json_encode($result);
} catch (Throwable $e) {
    SessionErrorResponder::respond($e);
}
