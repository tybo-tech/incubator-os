<?php
declare(strict_types=1);

/**
 * Deterministic, offline Google API client for tests (Sprint 010 Phase 1).
 *
 * No network access, ever. Tests can either rely on the sensible defaults or
 * queue scripted outcomes. It covers every failure the mapper must classify:
 * success, timeout, malformed JSON, 401, 403, 409/etag conflict, 429 and 5xx.
 *
 * Usage:
 *   $client = new FakeGoogleApiClient();
 *   $client->failNext(FakeGoogleApiClient::TIMEOUT);
 *   // ... call under test throws GoogleApiException with reason 'timeout'
 */
final class FakeGoogleApiClient implements GoogleApiClient
{
    public const SUCCESS = 'success';
    public const TIMEOUT = 'timeout';
    public const MALFORMED = 'malformed';
    public const UNAUTHORIZED = 'unauthorized';
    public const FORBIDDEN = 'forbidden';
    public const CONFLICT = 'conflict';
    public const RATE_LIMITED = 'rate_limited';
    public const SERVER_ERROR = 'server_error';
    public const INVALID_GRANT = 'invalid_grant';

    /** @var string[] queued outcomes for the next calls */
    private array $queue = [];

    /** Email returned by userInfoEmail(). */
    private string $email;

    private string $eventId;
    private int $etagCounter = 1;
    private bool $meetPending;

    /** @var array<int,array<string,mixed>> recorded insert payloads */
    public array $inserted = [];
    /** @var array<int,array<string,mixed>> recorded patch payloads */
    public array $patched = [];
    /** @var string[] recorded deleted event ids */
    public array $deleted = [];
    public int $revokeCalls = 0;
    public int $refreshCalls = 0;
    public int $exchangeCalls = 0;

    public function __construct(
        string $email = 'connected@example.com',
        string $eventId = 'fake-event-1',
        bool $meetPending = false,
    ) {
        $this->email = $email;
        $this->eventId = $eventId;
        $this->meetPending = $meetPending;
    }

    /** Queue an outcome for the next call, in order. */
    public function failNext(string ...$outcomes): self
    {
        foreach ($outcomes as $outcome) {
            $this->queue[] = $outcome;
        }
        return $this;
    }

    private function shift(): string
    {
        return array_shift($this->queue) ?? self::SUCCESS;
    }

    private function throwFor(string $outcome): void
    {
        switch ($outcome) {
            case self::TIMEOUT:
                throw GoogleApiErrorMapper::timeout();
            case self::MALFORMED:
                throw GoogleApiErrorMapper::malformed();
            case self::UNAUTHORIZED:
                throw GoogleApiErrorMapper::fromResponse(401, '');
            case self::FORBIDDEN:
                throw GoogleApiErrorMapper::fromResponse(403, '{"error":{"status":"PERMISSION_DENIED"}}');
            case self::CONFLICT:
                throw GoogleApiErrorMapper::fromResponse(412, '');
            case self::RATE_LIMITED:
                throw GoogleApiErrorMapper::fromResponse(429, '');
            case self::SERVER_ERROR:
                throw GoogleApiErrorMapper::fromResponse(503, '');
            case self::INVALID_GRANT:
                throw GoogleApiErrorMapper::fromResponse(400, '{"error":"invalid_grant"}');
        }
    }

    public function exchangeCode(string $code, string $redirectUri): GoogleTokenSet
    {
        $this->exchangeCalls++;
        $outcome = $this->shift();
        if ($outcome !== self::SUCCESS) {
            $this->throwFor($outcome);
        }
        return new GoogleTokenSet(
            accessToken: 'ya29.fake-access-' . $this->exchangeCalls,
            refreshToken: '1//fake-refresh-' . $this->exchangeCalls,
            expiresIn: 3600,
            scope: implode(' ', GoogleScopes::all()),
        );
    }

    public function refreshToken(string $refreshToken): GoogleTokenSet
    {
        $this->refreshCalls++;
        $outcome = $this->shift();
        if ($outcome !== self::SUCCESS) {
            $this->throwFor($outcome);
        }
        return new GoogleTokenSet(
            accessToken: 'ya29.fake-refreshed-' . $this->refreshCalls,
            refreshToken: null,
            expiresIn: 3600,
        );
    }

    public function userInfoEmail(string $accessToken): string
    {
        $outcome = $this->shift();
        if ($outcome !== self::SUCCESS) {
            $this->throwFor($outcome);
        }
        return $this->email;
    }

    public function revoke(string $token): bool
    {
        $this->revokeCalls++;
        $outcome = $this->shift();
        if ($outcome !== self::SUCCESS) {
            // Revoke is best-effort; never throw.
            return false;
        }
        return true;
    }

    public function insertEvent(string $calendarId, array $event, array $options = []): GoogleEventRef
    {
        $outcome = $this->shift();
        if ($outcome !== self::SUCCESS) {
            $this->throwFor($outcome);
        }
        $this->inserted[] = $event;

        $meet = null;
        $conferenceId = null;
        $status = 'success';
        if (isset($event['conferenceData']['createRequest'])) {
            if ($this->meetPending) {
                $status = 'pending';
            } else {
                $meet = 'https://meet.google.com/fake-' . $this->eventId;
                $conferenceId = 'fake-conference-' . $this->eventId;
            }
        }

        return new GoogleEventRef(
            eventId: $this->eventId,
            etag: $this->nextEtag(),
            htmlLink: 'https://calendar.google.com/event?eid=' . $this->eventId,
            meetUrl: $meet,
            conferenceId: $conferenceId,
            conferenceStatus: $status,
        );
    }

    public function patchEvent(string $calendarId, string $eventId, array $event, array $options = [], ?string $etag = null): GoogleEventRef
    {
        $outcome = $this->shift();
        if ($outcome !== self::SUCCESS) {
            $this->throwFor($outcome);
        }
        $this->patched[] = $event;

        // A conflicting etag is only reported when the caller supplied one.
        if ($etag !== null && $etag !== '' && $etag === '__stale__') {
            throw GoogleApiErrorMapper::fromResponse(412, '');
        }

        return new GoogleEventRef(
            eventId: $eventId,
            etag: $this->nextEtag(),
            htmlLink: 'https://calendar.google.com/event?eid=' . $eventId,
            meetUrl: 'https://meet.google.com/fake-' . $eventId,
            conferenceId: 'fake-conference-' . $eventId,
            conferenceStatus: 'success',
        );
    }

    public function deleteEvent(string $calendarId, string $eventId, array $options = []): void
    {
        $outcome = $this->shift();
        if ($outcome !== self::SUCCESS) {
            $this->throwFor($outcome);
        }
        $this->deleted[] = $eventId;
    }

    private function nextEtag(): string
    {
        return '"fake-etag-' . $this->etagCounter++ . '"';
    }
}
