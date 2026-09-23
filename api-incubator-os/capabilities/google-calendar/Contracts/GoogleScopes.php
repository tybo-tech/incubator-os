<?php
declare(strict_types=1);

/**
 * The exact Google OAuth scope set requested by the connect flow (Sprint 010).
 *
 * Least-privilege, locked here so no endpoint can widen it silently:
 *   * openid + email          — to read the connected account's email address.
 *   * calendar.events         — read/write events on the connected user's
 *                               calendars (creates the event, the Meet
 *                               conference and the invitations).
 *
 * `calendar.events` is a SENSITIVE scope: Google app verification is required
 * before public use. See docs/google-calendar-api.md (Phase 6).
 */
final class GoogleScopes
{
    public const OPENID = 'openid';
    public const EMAIL = 'email';
    public const CALENDAR_EVENTS = 'https://www.googleapis.com/auth/calendar.events';

    /** @return string[] */
    public static function all(): array
    {
        return [self::OPENID, self::EMAIL, self::CALENDAR_EVENTS];
    }

    /** Space-delimited form required by the OAuth authorization URL. */
    public static function asParameter(): string
    {
        return implode(' ', self::all());
    }
}
