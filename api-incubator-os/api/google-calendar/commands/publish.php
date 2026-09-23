<?php
declare(strict_types=1);

/**
 * POST /api/google-calendar/commands/publish.php?id=
 *
 * Publish a calendar event to the acting user's Google Calendar, requesting a
 * Meet conference automatically for the `meeting` category.
 *
 * Idempotent: publishing an already-published event returns the existing Google
 * projection instead of creating a second event or conference.
 *
 * Body: { version?: int }  — optional optimistic-concurrency echo (the event's
 * own version is authoritative for the local row; publishing does not mutate the
 * calendar event).
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
    $result = (new PublishCalendarEventToGoogle(
        new CalendarEventRepository($db),
        GoogleEventSyncService::fromConfig($db, $googlePolicy),
        $googlePolicy,
    ))->execute($id);

    echo json_encode($result);
} catch (Throwable $e) {
    // A calendar-level failure (event not found) uses the calendar responder;
    // everything else is a Google-capability failure.
    if ($e instanceof CalendarValidationException
        || $e instanceof CalendarForbiddenException
        || $e instanceof CalendarNotFoundException
        || $e instanceof CalendarConflictException) {
        CalendarErrorResponder::respond($e);
        exit;
    }
    GoogleErrorResponder::respond($e);
}
