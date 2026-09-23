<?php
declare(strict_types=1);

/**
 * Real Google API transport over cURL (Sprint 010 Phase 1).
 *
 * Guardrails:
 *   * TLS peer + host verification ON. Never disabled.
 *   * Bounded connect/read timeouts and a maximum response size — a hostile or
 *     broken endpoint cannot exhaust memory or hang a request.
 *   * `CURLOPT_FOLLOWLOCATION` OFF; only Google endpoints are called.
 *   * Failures are translated into `GoogleApiException` (never raw cURL text or
 *     the response body). Logging goes through `GoogleLog` (redacted).
 *   * No credential value is ever logged.
 *
 * Endpoints are the documented Google REST resources; only the token endpoint,
 * userinfo, revoke and calendar events are used.
 */
final class CurlGoogleApiClient implements GoogleApiClient
{
    private const AUTH_ENDPOINT = 'https://oauth2.googleapis.com/token';
    private const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';
    private const USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';
    private const CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3';

    private const CONNECT_TIMEOUT = 10;
    private const READ_TIMEOUT = 20;
    private const MAX_RESPONSE_BYTES = 2 * 1024 * 1024; // 2 MiB

    public function __construct(
        private readonly string $clientId,
        private readonly string $clientSecret,
    ) {
        // Register the secret so it is redacted from any log line, even if a
        // future contributor logs a payload that happens to contain it.
        SecretRedactor::register($this->clientSecret);
    }

    public static function fromConfig(): self
    {
        $config = google_config();
        return new self((string) $config['client_id'], (string) $config['client_secret']);
    }

    public function exchangeCode(string $code, string $redirectUri): GoogleTokenSet
    {
        $body = $this->request('POST', self::AUTH_ENDPOINT, [
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => $redirectUri,
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
        ]);

        return $this->tokenSet($body);
    }

    public function refreshToken(string $refreshToken): GoogleTokenSet
    {
        $body = $this->request('POST', self::AUTH_ENDPOINT, [
            'grant_type' => 'refresh_token',
            'refresh_token' => $refreshToken,
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
        ]);

        return $this->tokenSet($body);
    }

    public function userInfoEmail(string $accessToken): string
    {
        $body = $this->request('GET', self::USERINFO_ENDPOINT, null, $accessToken);
        $decoded = $this->decode($body);
        $email = (string) ($decoded['email'] ?? '');
        if ($email === '') {
            throw GoogleApiErrorMapper::malformed();
        }
        return $email;
    }

    public function revoke(string $token): bool
    {
        try {
            // Google accepts the token as a form parameter; revocation is
            // best-effort and must never throw to the caller.
            $this->request('POST', self::REVOKE_ENDPOINT, ['token' => $token]);
            return true;
        } catch (Throwable $e) {
            GoogleLog::warning('Token revocation failed.', ['reason' => $e instanceof GoogleApiException ? $e->reason() : 'unknown']);
            return false;
        }
    }

    public function insertEvent(string $calendarId, array $event, array $options = [], ?string $accessToken = null): GoogleEventRef
    {
        $query = $this->eventQuery($options, true);
        $url = self::CALENDAR_BASE . '/calendars/' . rawurlencode($calendarId) . '/events' . $query;
        $body = $this->request('POST', $url, $event, $accessToken);
        return GoogleEventRef::fromArray($this->decode($body));
    }

    public function getEvent(string $calendarId, string $eventId, array $options = [], ?string $accessToken = null): GoogleEventRef
    {
        $query = $this->eventQuery($options, true);
        $url = self::CALENDAR_BASE . '/calendars/' . rawurlencode($calendarId) . '/events/' . rawurlencode($eventId) . $query;
        $body = $this->request('GET', $url, null, $accessToken);
        return GoogleEventRef::fromArray($this->decode($body));
    }

    public function patchEvent(string $calendarId, string $eventId, array $event, array $options = [], ?string $etag = null, ?string $accessToken = null): GoogleEventRef
    {
        $query = $this->eventQuery($options, true);
        $url = self::CALENDAR_BASE . '/calendars/' . rawurlencode($calendarId) . '/events/' . rawurlencode($eventId) . $query;
        $headers = [];
        if ($etag !== null && $etag !== '') {
            // Optimistic concurrency: Google answers 412 when the event moved on.
            $headers[] = 'If-Match: ' . $etag;
        }
        $body = $this->request('PATCH', $url, $event, $accessToken, $headers);
        return GoogleEventRef::fromArray($this->decode($body));
    }

    public function deleteEvent(string $calendarId, string $eventId, array $options = [], ?string $accessToken = null): void
    {
        $sendUpdates = (string) ($options['sendUpdates'] ?? 'none');
        $query = '?sendUpdates=' . rawurlencode($sendUpdates);
        $url = self::CALENDAR_BASE . '/calendars/' . rawurlencode($calendarId) . '/events/' . rawurlencode($eventId) . $query;
        $this->request('DELETE', $url, null, $accessToken);
    }

    /**
     * @param array<string,mixed> $options
     */
    private function eventQuery(array $options, bool $withConference): string
    {
        $params = [];
        if ($withConference && (int) ($options['conferenceDataVersion'] ?? 0) > 0) {
            $params['conferenceDataVersion'] = (int) $options['conferenceDataVersion'];
        }
        $sendUpdates = (string) ($options['sendUpdates'] ?? '');
        if ($sendUpdates !== '') {
            $params['sendUpdates'] = $sendUpdates;
        }
        return $params ? '?' . http_build_query($params) : '';
    }

    private function tokenSet(string $body): GoogleTokenSet
    {
        $tokenSet = GoogleTokenSet::fromArray($this->decode($body));
        if (!$tokenSet->isComplete()) {
            throw GoogleApiErrorMapper::malformed();
        }
        return $tokenSet;
    }

    /**
     * @return array<string,mixed>
     */
    private function decode(string $body): array
    {
        $decoded = json_decode($body, true);
        if (!is_array($decoded)) {
            throw GoogleApiErrorMapper::malformed();
        }
        return $decoded;
    }

    /**
     * Perform a request with bounded limits and classified errors.
     *
     * @param array<string,mixed>|null $payload JSON body, or form fields when
     *        `$form` is true.
     * @param string[] $extraHeaders
     * @return string Raw response body (callers decode it).
     * @throws GoogleApiException
     */
    private function request(
        string $method,
        string $url,
        ?array $payload = null,
        ?string $accessToken = null,
        array $extraHeaders = [],
    ): string {
        if (!function_exists('curl_init')) {
            throw GoogleApiErrorMapper::network();
        }

        $ch = curl_init($url);
        $headers = ['Accept: application/json'];
        foreach ($extraHeaders as $h) {
            $headers[] = $h;
        }

        $options = [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_CONNECTTIMEOUT => self::CONNECT_TIMEOUT,
            CURLOPT_TIMEOUT => self::READ_TIMEOUT,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_USERAGENT => 'incubator-os-google-calendar/1.0',
            CURLOPT_HTTPHEADER => $headers,
        ];

        if ($accessToken !== null) {
            $headers[] = 'Authorization: Bearer ' . $accessToken;
            $options[CURLOPT_HTTPHEADER] = $headers;
        }

        if ($payload !== null) {
            if ($this->looksLikeForm($url)) {
                $headers[] = 'Content-Type: application/x-www-form-urlencoded';
                $options[CURLOPT_HTTPHEADER] = $headers;
                $options[CURLOPT_POSTFIELDS] = http_build_query($payload);
            } else {
                $encoded = json_encode($payload);
                if ($encoded === false) {
                    curl_close($ch);
                    throw GoogleApiErrorMapper::malformed();
                }
                $headers[] = 'Content-Type: application/json';
                $options[CURLOPT_HTTPHEADER] = $headers;
                $options[CURLOPT_POSTFIELDS] = $encoded;
            }
        }

        curl_setopt_array($ch, $options);

        // Bound the response size so a runaway body cannot exhaust memory.
        $response = '';
        curl_setopt($ch, CURLOPT_WRITEFUNCTION, static function ($handle, $chunk) use (&$response): int {
            $response .= $chunk;
            if (strlen($response) > self::MAX_RESPONSE_BYTES) {
                return 0; // abort the transfer
            }
            return strlen($chunk);
        });

        $ok = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $errno = curl_errno($ch);
        $error = curl_error($ch);
        curl_close($ch);

        if ($ok === false) {
            if ($errno === CURLE_OPERATION_TIMEDOUT) {
                throw GoogleApiErrorMapper::timeout();
            }
            // Do not log the raw cURL error verbatim; it is redacted anyway.
            GoogleLog::warning('Google transport failure.', ['errno' => $errno, 'detail' => SecretRedactor::redact($error)]);
            throw GoogleApiErrorMapper::network();
        }

        if ($status < 200 || $status >= 300) {
            throw GoogleApiErrorMapper::fromResponse($status, $response);
        }

        return $response;
    }

    private function looksLikeForm(string $url): bool
    {
        return str_contains($url, '/token') || str_contains($url, '/revoke');
    }
}
