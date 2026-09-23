<?php
declare(strict_types=1);

/**
 * The seam through which the capability talks to Google (Sprint 010 Phase 1).
 *
 * Callers depend on this interface only, so the transport can be swapped
 * (cURL today; `google/apiclient` or another HTTP stack later) without touching
 * business code. Two implementations exist:
 *   * `CurlGoogleApiClient` — real HTTPS calls, TLS verified, bounded.
 *   * `FakeGoogleApiClient` — deterministic, offline, for tests.
 *
 * Every implementation MUST translate Google failures into `GoogleApiException`
 * with a stable reason code, and MUST never leak credential material.
 */
interface GoogleApiClient
{
    /**
     * Exchange an authorization code for tokens (web-server OAuth flow).
     *
     * @throws GoogleApiException
     */
    public function exchangeCode(string $code, string $redirectUri): GoogleTokenSet;

    /**
     * Exchange a refresh token for a fresh access token.
     *
     * @throws GoogleApiException (reason invalid_grant when revoked/expired)
     */
    public function refreshToken(string $refreshToken): GoogleTokenSet;

    /**
     * The email address of the connected Google account (OpenID userinfo).
     *
     * @throws GoogleApiException
     */
    public function userInfoEmail(string $accessToken): string;

    /**
     * Best-effort token revocation. Never throws: a failed revoke must not block
     * a local disconnect.
     */
    public function revoke(string $token): bool;

    /**
     * Insert a calendar event, optionally requesting a Meet conference.
     *
     * Implementations SHOULD support a deterministic id in `$event['id']`; when
     * Google already holds that id it answers 409, which the mapper surfaces as
     * `GoogleApiException::REASON_DUPLICATE` so the caller can recover instead of
     * creating a duplicate.
     *
     * @param array<string,mixed> $event Google Calendar event resource
     * @param array<string,mixed> $options e.g. conferenceDataVersion, sendUpdates
     * @param string|null $accessToken Bearer token; required by the real transport
     *                                  and ignored by the offline fake.
     * @throws GoogleApiException
     */
    public function insertEvent(string $calendarId, array $event, array $options = [], ?string $accessToken = null): GoogleEventRef;

    /**
     * Read a single calendar event.
     *
     * Used to recover an event a previous publish created but did not persist,
     * and to promote an asynchronous `pending` conference once it is `success`.
     *
     * @throws GoogleApiException (reason not_found when the event is gone)
     */
    public function getEvent(string $calendarId, string $eventId, array $options = [], ?string $accessToken = null): GoogleEventRef;

    /**
     * Patch a calendar event (partial update), guarded by an optional etag.
     *
     * @throws GoogleApiException (reason conflict on etag mismatch)
     */
    public function patchEvent(string $calendarId, string $eventId, array $event, array $options = [], ?string $etag = null, ?string $accessToken = null): GoogleEventRef;

    /**
     * Delete a calendar event.
     *
     * @throws GoogleApiException
     */
    public function deleteEvent(string $calendarId, string $eventId, array $options = [], ?string $accessToken = null): void;
}
