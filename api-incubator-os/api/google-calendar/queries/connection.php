<?php
declare(strict_types=1);

/**
 * GET /api/google-calendar/queries/connection.php
 *
 * The acting user's Google connection status. This is the ONLY shape exposed to
 * the browser: no ciphertext, nonce, tag, token expiry internals or configuration
 * secret is ever included (see `GoogleConnectionResponse`).
 */

include_once __DIR__ . '/../_bootstrap.php';

try {
    google_require_configured();

    $db = (new Database())->connect();
    $actor = auth_require_user($db);
    $policy = new GoogleAccessPolicy($actor);

    $repo = new GoogleConnectionRepository($db);
    $row = $repo->findForUser($policy->actorId(), $policy->tenantId());

    if ($row === null) {
        echo json_encode(GoogleConnectionResponse::disconnected());
        exit;
    }

    $status = (string) ($row['status'] ?? 'connected');
    $lastSyncedAt = null;
    $stmt = $db->prepare(
        'SELECT MAX(last_synced_at) FROM google_event_sync WHERE connection_id = :id'
    );
    $stmt->execute(['id' => (int) $row['id']]);
    $value = $stmt->fetchColumn();
    if (is_string($value) && $value !== '') {
        $lastSyncedAt = $value;
    }

    $response = new GoogleConnectionResponse(
        status: $status,
        googleAccountEmail: $row['google_account_email'] !== null ? (string) $row['google_account_email'] : null,
        calendarId: $row['google_calendar_id'] !== null ? (string) $row['google_calendar_id'] : null,
        connectedAt: $row['connected_at'] !== null ? (string) $row['connected_at'] : null,
        lastSyncedAt: $lastSyncedAt,
        needsReconnect: $status === 'needs_reconnect',
        pendingAccountEmail: $row['pending_account_email'] !== null ? (string) $row['pending_account_email'] : null,
    );

    echo json_encode($response);
} catch (Throwable $e) {
    GoogleErrorResponder::respond($e);
}
