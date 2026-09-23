<?php
declare(strict_types=1);

/**
 * POST /api/google-calendar/commands/disconnect.php
 *
 * Disconnect the acting user's Google account. Remote revocation is best-effort;
 * the local encrypted tokens are ALWAYS cleared. When published mappings
 * reference the connection, the row is preserved as `disconnected` (audit
 * identity) instead of being hard-deleted.
 */

include_once __DIR__ . '/../_bootstrap.php';

try {
    google_require_configured();

    $db = (new Database())->connect();
    $actor = auth_require_user($db);
    $policy = new GoogleAccessPolicy($actor);

    $service = OAuthService::fromConfig($db);
    $hardDeleted = $service->disconnect($policy->tenantId(), $policy->actorId());

    echo json_encode([
        'success' => true,
        'message' => $hardDeleted
            ? 'Google Calendar disconnected.'
            : 'Google Calendar disconnected. Existing published mappings were preserved for audit.',
        'data' => [
            'status' => 'disconnected',
            'connectionRemoved' => $hardDeleted,
        ],
        'warnings' => [],
    ]);
} catch (Throwable $e) {
    GoogleErrorResponder::respond($e);
}
