<?php
declare(strict_types=1);

/**
 * POST soft-delete a calendar event. `?id=` identifies the event.
 * `version` (optional) enables optimistic concurrency.
 *
 * Soft delete is distinct from cancellation: cancel keeps the event visible.
 *
 * When the Google Calendar capability is deployed and configured, a soft-deleted
 * event that was published is best-effort removed from Google AFTER the local
 * commit. A Google failure never blocks or fails the local delete.
 */

include_once '../../../config/Database.php';
include_once '../../../core/Infrastructure/TransactionManager.php';
include_once '../../../helpers/AuthGuard.php';
include_once '../../../capabilities/calendar/Contracts/CalendarExceptions.php';
include_once '../../../capabilities/calendar/Contracts/CalendarErrorResponder.php';
include_once '../../../capabilities/calendar/Contracts/CalendarSessionGuard.php';
include_once '../../../capabilities/calendar/Contracts/GoogleEventSyncHook.php';
include_once '../../../capabilities/calendar/Contracts/Responses/CommandResult.php';
include_once '../../../capabilities/calendar/Services/CalendarAccessPolicy.php';
include_once '../../../capabilities/calendar/Repository/CalendarEventRepository.php';
include_once '../../../capabilities/calendar/Application/Commands/DeleteCalendarEvent.php';

// When the Sessions capability is deployed, a linked event must not be deleted.
// Loaded defensively (the two capabilities can be deployed independently).
$sessionGuard = null;
$guardFile = __DIR__ . '/../../../capabilities/sessions/Services/SessionCalendarGuard.php';
if (is_file($guardFile)) {
    include_once $guardFile;
    $sessionGuard = 'SessionCalendarGuard';
}

if (!function_exists('calendar_projection_hook')) {
    /**
     * Build the Google projection hook when the capability is present AND
     * configured. Returns null otherwise.
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
$input = is_array($input) ? $input : [];

try {
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'id is required']);
        exit;
    }

    $db = (new Database())->connect();
    $actor = auth_require_user($db);

    $version = isset($input['version']) && $input['version'] !== '' ? (int)$input['version'] : null;

    $result = (new DeleteCalendarEvent(
        new CalendarEventRepository($db),
        new CalendarAccessPolicy($actor),
        new TransactionManager($db),
        $sessionGuard !== null ? new $sessionGuard($db) : null,
        calendar_projection_hook($db, $actor),
    ))->execute($id, $version);

    echo json_encode($result);
} catch (Throwable $e) {
    CalendarErrorResponder::respond($e);
}
