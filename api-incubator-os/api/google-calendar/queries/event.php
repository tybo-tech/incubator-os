<?php
declare(strict_types=1);

/**
 * GET /api/google-calendar/queries/event.php?id=
 *
 * The Google projection of one calendar event, for the event modal's Google
 * section. Returns `{ status: "detached", published: false }` when the event has
 * no Google mapping. Requires access to the event.
 *
 * Never returns a token, ciphertext or configuration value.
 */

include_once __DIR__ . '/../_bootstrap.php';
include_once __DIR__ . '/../../../capabilities/calendar/Contracts/CalendarExceptions.php';
include_once __DIR__ . '/../../../capabilities/calendar/Contracts/CalendarErrorResponder.php';
include_once __DIR__ . '/../../../capabilities/calendar/Repository/CalendarEventRepository.php';
include_once __DIR__ . '/../../../capabilities/calendar/Services/CalendarAccessPolicy.php';

try {
    $id = (int) ($_GET['id'] ?? 0);

    $db = (new Database())->connect();
    $actor = auth_require_user($db);

    if ($id <= 0) {
        http_response_code(422);
        echo json_encode(['error' => 'Validation failed', 'errors' => ['id' => 'id is required']]);
        exit;
    }

    $policy = new CalendarAccessPolicy($actor);
    $event = (new CalendarEventRepository($db))->findById($id, $policy->tenantId());
    if ($event === null) {
        throw new CalendarNotFoundException("Calendar event $id was not found.");
    }
    // Viewing the projection follows the same authorization as viewing the event.
    $policy->assertCanAccessCompany($event['company_id'] !== null ? (int) $event['company_id'] : null);

    $row = (new GoogleEventSyncRepository($db))->findByCalendarEvent($id, $policy->tenantId());
    $response = $row !== null
        ? GoogleEventSyncResponse::fromRow($row)
        : GoogleEventSyncResponse::notPublished($id);

    echo json_encode([
        'success' => true,
        'data' => $response,
        'warnings' => [],
    ]);
} catch (Throwable $e) {
    // Calendar exceptions carry the correct status; Google ones map separately.
    if ($e instanceof CalendarValidationException
        || $e instanceof CalendarForbiddenException
        || $e instanceof CalendarNotFoundException
        || $e instanceof CalendarConflictException) {
        CalendarErrorResponder::respond($e);
        exit;
    }
    GoogleErrorResponder::respond($e);
}
