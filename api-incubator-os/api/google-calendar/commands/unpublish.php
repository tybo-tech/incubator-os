<?php
declare(strict_types=1);

/**
 * POST /api/google-calendar/commands/unpublish.php?id=
 *
 * Deliberately remove the Google copy while retaining the local event, Session and
 * audit history. The sync row is retained and marked `unpublished`.
 *
 * Outcomes:
 *   * 200 — removed (or already absent); the local records are untouched.
 *   * 409 GOOGLE_NOT_PUBLISHED — nothing to remove.
 *   * 401 GOOGLE_RECONNECT_REQUIRED — the connection needs reconnecting.
 *   * 502 — Google failed; the mapping stays active and retryable.
 */

include_once __DIR__ . '/../_bootstrap.php';
include_once __DIR__ . '/../../../capabilities/calendar/Contracts/CalendarExceptions.php';
include_once __DIR__ . '/../../../capabilities/calendar/Contracts/CalendarErrorResponder.php';
include_once __DIR__ . '/../../../capabilities/calendar/Contracts/Responses/CommandResult.php';
include_once __DIR__ . '/../../../capabilities/calendar/Repository/CalendarEventRepository.php';
include_once __DIR__ . '/../../../capabilities/calendar/Services/CalendarAccessPolicy.php';

try {
    google_require_configured();

    $id = (int) ($_GET['id'] ?? 0);

    $db = (new Database())->connect();
    $actor = auth_require_user($db);

    if ($id <= 0) {
        http_response_code(422);
        echo json_encode(['error' => 'Validation failed', 'errors' => ['id' => 'id is required']]);
        exit;
    }

    $googlePolicy = new GoogleAccessPolicy($actor);
    $result = (new UnpublishCalendarEventFromGoogle(
        new CalendarEventRepository($db),
        GoogleEventSyncService::fromConfig($db, $googlePolicy),
        $googlePolicy,
    ))->execute($id);

    echo json_encode($result);
} catch (Throwable $e) {
    if ($e instanceof CalendarValidationException
        || $e instanceof CalendarForbiddenException
        || $e instanceof CalendarNotFoundException
        || $e instanceof CalendarConflictException) {
        CalendarErrorResponder::respond($e);
        exit;
    }
    GoogleErrorResponder::respond($e);
}
