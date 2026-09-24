<?php
declare(strict_types=1);

/**
 * POST cancel a Session (reason required) and cancel its linked calendar event.
 * `?id=`. Body: cancellationReason, version.
 */

include_once __DIR__ . '/../_bootstrap.php';

// When the Google Calendar capability is deployed and configured, wire its
// projection hook so the linked event's Google copy is cancelled best-effort
// AFTER the atomic local cancellation commits. The hook is optional; the Sessions
// capability never references a google-calendar file itself.
if (!function_exists('sessions_projection_hook')) {
    /**
     * @param array<string,mixed> $actor
     */
    function sessions_projection_hook(?PDO $db, array $actor): ?GoogleEventSyncHook
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
        sessions_projection_hook($db, $actor),
    ))->execute($id, $reason, $version);

    echo json_encode($result);
} catch (Throwable $e) {
    SessionErrorResponder::respond($e);
}
