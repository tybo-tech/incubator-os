<?php
declare(strict_types=1);

/**
 * Central PHP session configuration.
 *
 * The application previously used `session_set_cookie_params()` inline in every
 * endpoint with no `session.gc_maxlifetime` override. PHP's default lifetime is
 * 1440 seconds (24 minutes), so the server garbage-collected the session while
 * the browser cookie and the Angular localStorage user cache still looked
 * logged-in — producing stray `401 Unauthorised — no active session` responses
 * (e.g. on the SWOT workspace) followed by a redirect to /login on refresh.
 *
 * APP_SESSION_LIFETIME is now 24 hours. Keep the cookie lifetime and the server
 * gc_maxlifetime in lock-step so the client and server agree on when the session
 * ends.
 */

const APP_SESSION_LIFETIME = 86400; // 24 hours (seconds)

/**
 * Starts the session with the shared cookie params and lifetime, unless one is
 * already active. Safe to call repeatedly and from any endpoint.
 */
function app_session_start(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    // Server-side GC must match the cookie lifetime, otherwise PHP still expires
    // the session before the cookie does.
    ini_set('session.gc_maxlifetime', (string) APP_SESSION_LIFETIME);
    ini_set('session.cookie_lifetime', (string) APP_SESSION_LIFETIME);

    session_set_cookie_params([
        'lifetime' => APP_SESSION_LIFETIME,
        'path' => '/',
        'domain' => '',
        'secure' => true,
        'httponly' => true,
        'samesite' => 'None',
    ]);

    session_start();
}
