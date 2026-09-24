<?php
declare(strict_types=1);

/**
 * Typed exceptions for the Google Calendar capability (Sprint 010 Phase 1).
 *
 * Co-located and always loaded together, mirroring `CalendarExceptions.php`.
 * Each type maps to a distinct HTTP status in `GoogleErrorResponder`.
 */

/**
 * The Google provider is present but unusable (missing/invalid local
 * credentials). Endpoints map this to 503 GOOGLE_NOT_CONFIGURED.
 * Declared in config/google.php as well (guarded) so the config layer can throw
 * it without depending on a capability file.
 */
if (!class_exists('GoogleConfigurationException', false)) {
    final class GoogleConfigurationException extends RuntimeException {}
}

/**
 * Token decryption failed: wrong key, tampered ciphertext, unknown key version
 * or malformed payload. ALWAYS fails closed — no plaintext is ever returned.
 */
final class GoogleDecryptionException extends RuntimeException {}

/**
 * A remote Google API call failed, timed out, returned a malformed body, or
 * responded with an error status. `reason()` is a stable machine code so callers
 * never string-match a message.
 */
final class GoogleApiException extends RuntimeException
{
    public const REASON_INVALID_GRANT = 'invalid_grant';
    public const REASON_UNAUTHORIZED = 'unauthorized';
    public const REASON_FORBIDDEN = 'forbidden';
    public const REASON_CONFLICT = 'conflict';
    public const REASON_RATE_LIMITED = 'rate_limited';
    public const REASON_SERVER_ERROR = 'server_error';
    public const REASON_MALFORMED = 'malformed_response';
    public const REASON_TIMEOUT = 'timeout';
    public const REASON_NETWORK = 'network';
    /** The Google resource does not exist (e.g. an event id we tried to recover). */
    public const REASON_NOT_FOUND = 'not_found';
    /**
     * Google refused to create a resource because the deterministic id already
     * exists. This is the RECOVERY signal: a previous publish reached Google but
     * did not persist locally, so the existing event must be read back instead of
     * creating a duplicate.
     */
    public const REASON_DUPLICATE = 'duplicate';

    public function __construct(
        string $message,
        private readonly string $reason = self::REASON_NETWORK,
        private readonly int $status = 0,
    ) {
        parent::__construct($message);
    }

    public function reason(): string
    {
        return $this->reason;
    }

    public function status(): int
    {
        return $this->status;
    }

    /** True when the caller must reconnect (token can no longer be refreshed). */
    public function requiresReconnect(): bool
    {
        return $this->reason === self::REASON_INVALID_GRANT
            || $this->reason === self::REASON_UNAUTHORIZED;
    }
}

/**
 * The OAuth `state` was missing, malformed, expired, already consumed, or bound
 * to a different user/tenant than the current session. Always rejected BEFORE a
 * code is exchanged or any connection is written.
 */
final class GoogleOAuthStateException extends RuntimeException {}

/**
 * The actor may not perform the requested Google action (e.g. managing another
 * user's connection).
 */
final class GoogleForbiddenException extends RuntimeException {}

/**
 * The callback lacked a code, carried an unknown result, or otherwise could not
 * be processed. No connection is written.
 */
final class GoogleOAuthCallbackException extends RuntimeException {}

/**
 * The user denied consent (Google returned an error such as `access_denied`).
 * Treated as a normal, safe outcome — no connection is written.
 */
final class GoogleConsentDeniedException extends RuntimeException {}

/**
 * The required Calendar scope was not granted, so the connection is unusable and
 * is not stored.
 */
final class GoogleScopeException extends RuntimeException {}

/**
 * The reconnect used a different Google account while published event mappings
 * already exist. Mappings must NOT be silently reassigned; reconciliation is a
 * later, explicit action.
 */
final class GoogleAccountMismatchException extends RuntimeException
{
    public function __construct(private readonly string $pendingEmail = '')
    {
        parent::__construct('A different Google account was used while existing published mappings reference the previous account.');
    }

    public function pendingEmail(): string
    {
        return $this->pendingEmail;
    }
}

/**
 * The acting user has no usable Google connection (none, or one that requires
 * reconnecting). Publishing is refused without contacting Google.
 */
final class GoogleNotConnectedException extends RuntimeException
{
    public function __construct(string $message = 'Connect your Google Calendar before publishing.', private readonly string $connectionStatus = 'disconnected')
    {
        parent::__construct($message);
    }

    public function connectionStatus(): string
    {
        return $this->connectionStatus;
    }
}

/**
 * A publish is already in flight for this event (another caller holds the lease).
 * The caller should retry shortly; Google was NOT contacted.
 */
final class GooglePublishInProgressException extends RuntimeException
{
    public function __construct(string $message = 'This event is already being published to Google. Try again in a moment.')
    {
        parent::__construct($message);
    }
}

/**
 * An operation (publish/sync/cancel/unpublish) was requested for an event that has
 * no Google projection. The caller must publish before syncing or unpublishing.
 */
final class GoogleNotPublishedException extends RuntimeException
{
    public function __construct(string $message = 'This event has not been published to Google.')
    {
        parent::__construct($message);
    }
}

/**
 * A Google-side edit was detected through an etag mismatch (HTTP 412). The local
 * and Google copies have diverged; Incubator OS is authoritative, so nothing is
 * overwritten automatically. The state is recorded as `conflict` for review.
 */
final class GoogleSyncConflictException extends RuntimeException
{
    public function __construct(
        private readonly ?string $localEtag = null,
        private readonly ?string $remoteEtag = null,
    ) {
        parent::__construct('The Google event was changed externally. Review the conflict before syncing again.');
    }

    public function localEtag(): ?string
    {
        return $this->localEtag;
    }

    public function remoteEtag(): ?string
    {
        return $this->remoteEtag;
    }
}

/**
 * Another operation holds the event's lease (a concurrent publish/sync/cancel).
 * The caller should retry shortly; Google was NOT contacted.
 */
final class GoogleOperationInProgressException extends RuntimeException
{
    public function __construct(string $message = 'This event is already being synchronised with Google. Try again in a moment.')
    {
        parent::__construct($message);
    }
}

/**
 * The Google event is already absent (HTTP 404/410). For a cancellation or an
 * unpublish this is a SUCCESS: the desired end state (no remote event) already
 * holds.
 */
final class GoogleNotFoundException extends RuntimeException
{
    public function __construct(string $message = 'The Google event is already absent.')
    {
        parent::__construct($message);
    }
}
