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
    /** 404 — the event id does not exist (used by getEvent). */
    public const NOT_FOUND = 'not_found';
    /** 409 duplicate — an insert used an id Google already holds. */
    public const DUPLICATE = 'duplicate';
    /**
     * Google CREATES the event and then the response is lost (timeout). This is
     * the "succeeded remotely but we never saw the answer" failure: the event is
     * recorded, then a timeout is thrown so the caller must recover rather than
     * create a duplicate.
     */
    public const CREATE_THEN_TIMEOUT = 'create_then_timeout';

    /** @var string[] queued outcomes for the next calls */
    private array $queue = [];

    /** Email returned by userInfoEmail(). */
    private string $email;

    private string $eventId;
    private int $etagCounter = 1;
    private bool $meetPending;
    /** When true, a requested conference reports `failure` (event still created). */
    private bool $meetFailure = false;

    /** Override the granted scope string returned by exchangeCode (test knob). */
    private ?string $scopeOverride = null;
    /** When true, exchangeCode returns NO refresh token (test knob). */
    private bool $omitRefreshToken = false;

    /** @var array<int,array<string,mixed>> recorded insert payloads */
    public array $inserted = [];
    /** @var array<int,array<string,mixed>> recorded insert options (per call) */
    public array $insertOptions = [];
    /** @var array<int,array<string,mixed>> recorded patch payloads */
    public array $patched = [];
    /** @var string[] recorded deleted event ids */
    public array $deleted = [];
    /**
     * Persisted events keyed by id, so getEvent can recompute an event a previous
     * insert created (the fake is stateful within a single test process).
     *
     * @var array<string,array<string,mixed>>
     */
    public array $eventPayloads = [];
    /** Number of insert calls that reached Google (before any thrown error). */
    public int $insertCalls = 0;
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

    /** Test knob: force the scope string returned by exchangeCode. */
    public function setScopeOverride(?string $scope): self
    {
        $this->scopeOverride = $scope;
        return $this;
    }

    /** Test knob: make exchangeCode omit the refresh token. */
    public function setOmitRefreshToken(bool $omit): self
    {
        $this->omitRefreshToken = $omit;
        return $this;
    }

    /** Test knob: a requested conference reports failure (the event is still created). */
    public function setMeetFailure(bool $failure): self
    {
        $this->meetFailure = $failure;
        return $this;
    }

    /** Test knob: change the account email returned by userInfoEmail(). */
    public function setEmail(string $email): self
    {
        $this->email = $email;
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
            case self::NOT_FOUND:
                throw GoogleApiErrorMapper::fromResponse(404, '');
            case self::DUPLICATE:
                throw GoogleApiErrorMapper::fromResponse(409, '{"error":{"errors":[{"reason":"duplicate"}]}}');
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
            refreshToken: $this->omitRefreshToken ? null : '1//fake-refresh-' . $this->exchangeCalls,
            expiresIn: 3600,
            scope: $this->scopeOverride ?? implode(' ', GoogleScopes::all()),
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

    public function insertEvent(string $calendarId, array $event, array $options = [], ?string $accessToken = null): GoogleEventRef
    {
        $this->insertCalls++;
        // Honour a deterministic id supplied by the caller, so a retried publish
        // targets the SAME Google event rather than creating a second one.
        $id = isset($event['id']) && (string) $event['id'] !== '' ? (string) $event['id'] : $this->eventId;
        $outcome = $this->shift();

        // Faithful Google behaviour: inserting an id that already exists is a
        // duplicate (409), regardless of the queue. This is what makes a retried
        // publish recover instead of creating a second event.
        if ($outcome === self::SUCCESS && isset($this->eventPayloads[$id])) {
            $this->throwFor(self::DUPLICATE);
        }

        // A duplicate outcome means Google already holds this id: the caller must
        // recover the existing event instead of creating a second one.
        if ($outcome === self::DUPLICATE) {
            $this->throwFor($outcome);
        }

        // CREATE_THEN_TIMEOUT: Google creates the event, then the response is lost.
        // Record the event BEFORE throwing so a later getEvent/insert can recover it.
        if ($outcome === self::CREATE_THEN_TIMEOUT) {
            $this->eventPayloads[$id] = $event;
            throw GoogleApiErrorMapper::timeout();
        }

        if ($outcome !== self::SUCCESS) {
            $this->throwFor($outcome);
        }

        $this->inserted[] = $event;
        $this->insertOptions[] = $options;
        $this->eventPayloads[$id] = $event;
        return $this->makeRef($id, $event);
    }

    public function getEvent(string $calendarId, string $eventId, array $options = [], ?string $accessToken = null): GoogleEventRef
    {
        $outcome = $this->shift();
        if ($outcome !== self::SUCCESS) {
            $this->throwFor($outcome);
        }
        if (!isset($this->eventPayloads[$eventId])) {
            throw GoogleApiErrorMapper::fromResponse(404, '');
        }
        // Recompute from the stored payload so a test can flip `meetPending` off
        // between the insert and the read to simulate async conference success.
        return $this->makeRef($eventId, $this->eventPayloads[$eventId]);
    }

    /**
     * Build the normalised ref for an event, honouring the meet knobs. A requested
     * conference yields `pending`, `failure` or `success`; without a request the
     * status is `none`. Pure: recomputed from the stored payload + current knobs,
     * so a test can clear `meetPending` and a later read reports `success`.
     *
     * @param array<string,mixed> $event
     */
    private function makeRef(string $eventId, array $event): GoogleEventRef
    {
        $requested = isset($event['conferenceData']['createRequest']);

        if (!$requested) {
            return new GoogleEventRef(
                eventId: $eventId,
                etag: $this->nextEtag(),
                htmlLink: 'https://calendar.google.com/event?eid=' . $eventId,
                meetUrl: null,
                conferenceId: null,
                conferenceStatus: 'none',
            );
        }

        if ($this->meetFailure) {
            return new GoogleEventRef(
                eventId: $eventId,
                etag: $this->nextEtag(),
                htmlLink: 'https://calendar.google.com/event?eid=' . $eventId,
                meetUrl: null,
                conferenceId: null,
                conferenceStatus: 'failure',
            );
        }

        if ($this->meetPending) {
            return new GoogleEventRef(
                eventId: $eventId,
                etag: $this->nextEtag(),
                htmlLink: 'https://calendar.google.com/event?eid=' . $eventId,
                meetUrl: null,
                conferenceId: null,
                conferenceStatus: 'pending',
            );
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

    /** Test knob: stop treating requested conferences as pending (async promotion). */
    public function setMeetPending(bool $pending): self
    {
        $this->meetPending = $pending;
        return $this;
    }

    public function patchEvent(string $calendarId, string $eventId, array $event, array $options = [], ?string $etag = null, ?string $accessToken = null): GoogleEventRef
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

        // Merge the patch so a subsequent getEvent reflects the update.
        $this->eventPayloads[$eventId] = array_merge($this->eventPayloads[$eventId] ?? [], $event);

        return new GoogleEventRef(
            eventId: $eventId,
            etag: $this->nextEtag(),
            htmlLink: 'https://calendar.google.com/event?eid=' . $eventId,
            meetUrl: 'https://meet.google.com/fake-' . $eventId,
            conferenceId: 'fake-conference-' . $eventId,
            conferenceStatus: 'success',
        );
    }

    public function deleteEvent(string $calendarId, string $eventId, array $options = [], ?string $accessToken = null): void
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
