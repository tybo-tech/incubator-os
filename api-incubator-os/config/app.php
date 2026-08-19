<?php
/**
 * Application-level constants.
 *
 * APP_URL is resolved from the incoming request so that generated links always
 * point at the host the user is actually using (localhost, staging, or the
 * deployed domain) instead of a hardcoded value that has to be toggled by hand.
 * Set the APP_URL environment variable to force a specific origin.
 */

// ── Frontend origin ──────────────────────────────────────────────────────────
// The browser sends the `Origin` header on cross-origin requests (and
// `Referer` on all of them). Use it to learn the frontend's scheme/host/port,
// then fall back to the host/port the API itself was reached on.
if (!function_exists('app_url_from_request')) {
    function app_url_from_request(): string
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? '';
        if ($origin !== '') {
            $parts = parse_url($origin);
            if (isset($parts['scheme'], $parts['host'])) {
                $port = isset($parts['port']) ? ':' . $parts['port'] : '';
                return $parts['scheme'] . '://' . $parts['host'] . $port;
            }
        }

        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        return $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
    }
}

define('APP_ENV', getenv('APP_ENV') ?: 'local');
define('APP_URL', getenv('APP_URL') ?: app_url_from_request());
