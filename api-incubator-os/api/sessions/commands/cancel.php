<?php
declare(strict_types=1);

/**
 * POST cancel a Session (reason required) and cancel its linked calendar event.
 * `?id=`. Body: cancellationReason, version.
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

    $calendarValidator = new CalendarValidator();
    $reason = isset($input['cancellationReason']) ? (string)$input['cancellationReason'] : (isset($input['cancellation_reason']) ? (string)$input['cancellation_reason'] : '');
    $version = isset($input['version']) && $input['version'] !== '' ? (int)$input['version'] : null;

    $gateway = new SessionCalendarGateway(
        new CalendarEventRepository($db),
        new CalendarEventWriter(new CalendarLinkResolver($db), $calendarValidator),
        $calendarValidator,
        new CalendarAccessPolicy($actor),
    );

    $result = (new CancelSession(
        new SessionRepository($db),
        new SessionAccessPolicy($actor),
        $gateway,
        new TransactionManager($db),
    ))->execute($id, $reason, $version);

    echo json_encode($result);
} catch (Throwable $e) {
    SessionErrorResponder::respond($e);
}
