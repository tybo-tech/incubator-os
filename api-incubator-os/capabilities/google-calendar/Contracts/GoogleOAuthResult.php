<?php
declare(strict_types=1);

/**
 * The only values the OAuth callback may put in a browser redirect (Sprint 010
 * Phase 2).
 *
 * Security: a redirect may carry a SAFE RESULT CODE only. It must never carry a
 * token, an authorization code, a raw Google error, or any secret. The frontend
 * maps these codes to a human message; it never sees Google's own error text.
 */
final class GoogleOAuthResult
{
    /** A connection was stored (or a new refresh token preserved an old one). */
    public const CONNECTED = 'connected';

    /** The user denied consent. */
    public const DENIED = 'denied';

    /** The required Calendar scope was not granted. */
    public const SCOPE_MISSING = 'scope_missing';

    /** The state was missing/expired/reused/cross-user, or the callback malformed. */
    public const INVALID = 'invalid';

    /** The reconnect used a different Google account while mappings exist. */
    public const ACCOUNT_MISMATCH = 'account_mismatch';

    /** Google or the provider failed (network, server, unreadable token, etc.). */
    public const FAILED = 'failed';

    /** @return string[] */
    public static function all(): array
    {
        return [
            self::CONNECTED,
            self::DENIED,
            self::SCOPE_MISSING,
            self::INVALID,
            self::ACCOUNT_MISMATCH,
            self::FAILED,
        ];
    }

    public static function isValid(string $code): bool
    {
        return in_array($code, self::all(), true);
    }
}
