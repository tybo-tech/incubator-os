<?php
declare(strict_types=1);

/**
 * POST /api/google-calendar/commands/connect.php
 *
 * Begin the Google OAuth flow. Returns the authorization URL to which the caller
 * navigates. No token, client secret or other credential is returned.
 *
 * Body: { returnTo?: string }  — validated to a safe internal path.
 */

include_once __DIR__ . '/../_bootstrap.php';

try {
    google_require_configured();

    $db = (new Database())->connect();
    $actor = auth_require_user($db);
    $policy = new GoogleAccessPolicy($actor);

    $input = google_json_body();
    $returnTo = isset($input['returnTo']) ? (string) $input['returnTo'] : null;

    $service = OAuthService::fromConfig($db);
    $result = $service->authorizationUrl($policy->tenantId(), $policy->actorId(), $returnTo);

    echo json_encode([
        'success' => true,
        'message' => 'Open the authorization URL to connect Google Calendar.',
        'data' => [
            'authUrl' => $result['authUrl'],
        ],
        'warnings' => [],
    ]);
} catch (Throwable $e) {
    GoogleErrorResponder::respond($e);
}
