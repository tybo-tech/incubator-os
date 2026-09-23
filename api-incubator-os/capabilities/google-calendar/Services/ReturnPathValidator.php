<?php
declare(strict_types=1);

/**
 * Validates the post-callback frontend return path (Sprint 010 Phase 2).
 *
 * Prevents open redirects: only a same-origin, INTERNAL, relative path is
 * allowed. Anything absolute, protocol-relative (`//evil`), backslash-tricked,
 * scheme-bearing (`http:`, `javascript:`) or containing a control character is
 * rejected and replaced with the safe default `/`.
 *
 * The resolved path is what the browser is redirected to after OAuth; it must
 * never be attacker-controlled to another origin.
 */
final class ReturnPathValidator
{
    public const DEFAULT = '/';

    /** An in-app path prefix allowlist. Keeps redirects inside the app's surfaces. */
    private const ALLOWED_PREFIXES = ['/calendar', '/company/', '/'];

    public static function sanitize(?string $candidate): string
    {
        if ($candidate === null) {
            return self::DEFAULT;
        }

        $candidate = trim($candidate);
        if ($candidate === '') {
            return self::DEFAULT;
        }

        // Reject control characters outright.
        if (preg_match('/[\x00-\x1F\x7F]/', $candidate) === 1) {
            return self::DEFAULT;
        }

        // Reject backslashes (browsers may treat them as slashes).
        if (str_contains($candidate, '\\')) {
            return self::DEFAULT;
        }

        // Must be a same-origin RELATIVE path: exactly one leading slash, no scheme.
        if (!str_starts_with($candidate, '/')) {
            return self::DEFAULT;
        }
        // Protocol-relative `//host` would leave the origin.
        if (str_starts_with($candidate, '//')) {
            return self::DEFAULT;
        }
        // A colon before the first slash suggests a scheme (e.g. `http:`).
        if (preg_match('#^[^/]*:#', $candidate) === 1) {
            return self::DEFAULT;
        }

        $path = parse_url($candidate, PHP_URL_PATH);
        if (!is_string($path) || $path === '') {
            return self::DEFAULT;
        }

        // Reject any traversal that survives normalisation.
        if (str_contains($path, '..')) {
            return self::DEFAULT;
        }

        $allowed = false;
        foreach (self::ALLOWED_PREFIXES as $prefix) {
            if ($prefix === '/' || str_starts_with($path, $prefix)) {
                $allowed = true;
                break;
            }
        }
        if (!$allowed) {
            return self::DEFAULT;
        }

        // Drop the query string: only the path is returned, so a callback can never
        // be turned into a carrier for attacker-supplied parameters.
        return $path === '' ? self::DEFAULT : $path;
    }
}
