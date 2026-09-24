<?php
declare(strict_types=1);

/**
 * POST /api/google-calendar/commands/sync.php?id=
 *
 * Push local changes to the Google projection (reschedule/edit). Uses Google
 * PATCH and the stored etag through `If-Match`.
 *
 * Outcomes:
 *   * 200 with syncStatus `synced`      — the change reached Google.
 *   * 200 with syncStatus `update_pending` — a transient failure; the local change
 *     is safe and the sync will retry.
 *   * 409 SYNC_CONFLICT                 — a Google-side edit; nothing overwritten.
 *   * 401 GOOGLE_RECONNECT_REQUIRED     — the connection needs reconnecting.
 *   * 409 GOOGLE_NOT_PUBLISHED          — the event has no Google projection yet.
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
    $result = (new SyncCalendarEventToGoogle(
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
