<?php
declare(strict_types=1);

/**
 * POST/PUT update a calendar event. `?id=` identifies the event.
 * `version` in the body enables optimistic concurrency.
 *
 * When the Google Calendar capability is deployed and configured, a projection
 * hook is wired so a reschedule/cancel is pushed best-effort AFTER the local
 * commit. The calendar capability itself never references a google-calendar file;
 * the hook is optional and the endpoint decides whether to supply it.
 */

include_once '../../../config/Database.php';
include_once '../../../core/Infrastructure/TransactionManager.php';
include_once '../../../helpers/AuthGuard.php';
include_once '../../../capabilities/calendar/Contracts/CalendarExceptions.php';
include_once '../../../capabilities/calendar/Contracts/CalendarErrorResponder.php';
include_once '../../../capabilities/calendar/Contracts/CalendarCategory.php';
include_once '../../../capabilities/calendar/Contracts/CalendarStatus.php';
include_once '../../../capabilities/calendar/Contracts/CalendarLinkEntityType.php';
include_once '../../../capabilities/calendar/Contracts/CalendarEventLinkRef.php';
include_once '../../../capabilities/calendar/Contracts/CalendarEventResponse.php';
include_once '../../../capabilities/calendar/Contracts/CalendarEventRequest.php';
include_once '../../../capabilities/calendar/Contracts/CalendarEventMapper.php';
include_once '../../../capabilities/calendar/Contracts/GoogleEventSyncHook.php';
include_once '../../../capabilities/calendar/Contracts/Responses/CommandResult.php';
include_once '../../../capabilities/calendar/Services/CalendarValidator.php';
include_once '../../../capabilities/calendar/Services/CalendarAccessPolicy.php';
include_once '../../../capabilities/calendar/Services/CalendarEventWriter.php';
include_once '../../../capabilities/calendar/Repository/CalendarEventRepository.php';
include_once '../../../capabilities/calendar/Repository/CalendarLinkResolver.php';
include_once '../../../capabilities/calendar/Application/Commands/UpdateCalendarEvent.php';

// Wiring helper shared with the other calendar endpoints. Defined once, guarded.
if (!function_exists('calendar_projection_hook')) {
    /**
     * Build the Google projection hook when the capability is present AND
     * configured. Returns null otherwise, so a calendar-only deployment or an
     * unconfigured server behaves exactly as before.
     *
     * @param array<string,mixed> $actor
     */
    function calendar_projection_hook(?PDO $db, array $actor): ?GoogleEventSyncHook
    {
        $googleBootstrap = dirname(__DIR__, 2) . '/google-calendar/_bootstrap.php';
        if (!is_file($googleBootstrap) || $db === null) {
            return null;
        }
        try {
            include_once $googleBootstrap;
            if (!google_configured()) {
                return null;
            }
            return new GoogleCancelHook(
                GoogleEventSyncService::fromConfig($db, new GoogleAccessPolicy($actor)),
                $db,
            );
        } catch (Throwable) {
            return null;
        }
    }
}

$id = (int)($_GET['id'] ?? 0);
$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['error' => 'Request body is required']);
    exit;
}

try {
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'id is required']);
        exit;
    }

    $db = (new Database())->connect();
    $actor = auth_require_user($db);
    $policy = new CalendarAccessPolicy($actor);
    $repo = new CalendarEventRepository($db);
    $validator = new CalendarValidator();

    $request = CalendarEventRequest::fromArray($input);

    $result = (new UpdateCalendarEvent(
        $repo,
        new CalendarEventWriter(new CalendarLinkResolver($db), $validator),
        $validator,
        $policy,
        new TransactionManager($db),
        calendar_projection_hook($db, $actor),
    ))->execute($id, $request);

    echo json_encode($result);
} catch (Throwable $e) {
    CalendarErrorResponder::respond($e);
}
