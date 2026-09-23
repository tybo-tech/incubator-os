<?php
declare(strict_types=1);

/**
 * GET /api/google-calendar/commands/callback.php?code=&state=&error=
 *
 * The Google-initiated browser redirect. This is the ONLY endpoint whose HTTP
 * verb is fixed by Google (GET) rather than by the repository convention; it
 * still lives under `commands/` because it writes a connection.
 *
 * It requires BOTH a valid application session AND a matching, single-use state.
 * On success it stores an encrypted connection and 302s to a validated internal
 * path carrying only a safe result code. It never places a token, code or raw
 * Google error in the redirect.
 */

include_once __DIR__ . '/../_bootstrap.php';

try {
    google_require_configured();

    $db = (new Database())->connect();

    // A signed-in session is mandatory: the callback is bound to the user who
    // began the flow. auth_require_user exits 401 for an anonymous request, so no
    // connection is ever written without an application session.
    $actor = auth_require_user($db);
    $policy = new GoogleAccessPolicy($actor);

    /** @var array<string,string> $query */
    $query = [];
    foreach ($_GET as $key => $value) {
        if (is_string($value)) {
            $query[(string) $key] = $value;
        }
    }

    $service = OAuthService::fromConfig($db);
    $outcome = $service->handleCallback($query, $policy->tenantId(), $policy->actorId());

    google_oauth_redirect((string) $outcome['result'], (string) $outcome['returnPath']);
} catch (Throwable $e) {
    // Never leak an exception message into the browser URL. Log it (redacted) and
    // send the user back with a safe generic failure code.
    if (class_exists('GoogleLog')) {
        GoogleLog::error('OAuth callback failed.', ['type' => get_class($e)]);
    }
    google_oauth_redirect(GoogleOAuthResult::FAILED, ReturnPathValidator::DEFAULT);
}
