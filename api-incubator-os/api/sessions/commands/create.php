<?php
declare(strict_types=1);

/**
 * POST create a Session (and its company calendar event, atomically).
 *
 * With `calendarEventId` the existing eligible event is attached; without it a new
 * company meeting event is created in the same transaction.
 */

include_once __DIR__ . '/../_bootstrap.php';

$input = sessions_json_body();
if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Request body is required']);
    exit;
}

try {
    $db = (new Database())->connect();
    $actor = auth_require_user($db);

    $calendarValidator = new CalendarValidator();
    $policy = new SessionAccessPolicy($actor);

    $gateway = new SessionCalendarGateway(
        new CalendarEventRepository($db),
        new CalendarEventWriter(new CalendarLinkResolver($db), $calendarValidator),
        $calendarValidator,
        new CalendarAccessPolicy($actor),
    );

    $result = (new CreateSession(
        new SessionRepository($db),
        new SessionValidator($calendarValidator),
        $policy,
        $gateway,
        new TransactionManager($db),
    ))->execute(SessionRequest::fromArray($input));

    http_response_code(201);
    echo json_encode($result);
} catch (Throwable $e) {
    SessionErrorResponder::respond($e);
}
