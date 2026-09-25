<?php
declare(strict_types=1);

/**
 * Sprint 010 Phase 1 — foundation test suite (offline, no network, no database).
 *
 * Proves the Phase 1 exit criteria:
 *   1. Encryption round-trip.
 *   2. Random-nonce proof (identical plaintexts -> different ciphertext/nonce).
 *   3. Tamper detection.
 *   4. Wrong-key and missing-key rejection (fail closed).
 *   5. Key-version mismatch rejection.
 *   6. AAD binding (a ciphertext cannot be moved to another owner/purpose).
 *   7. No-secret logging (redaction of tokens, codes and client secrets).
 *   8. Fake-client error mapping (success, timeout, malformed, 401, 403,
 *      409/etag conflict, 429, 5xx, invalid_grant).
 *   9. Config fail-closed behaviour.
 *
 * Run:
 *   php api-incubator-os/tests/GoogleCalendarPhase1.php
 *
 * Exit code 0 when every check passes, 1 otherwise.
 */

error_reporting(E_ALL);
ini_set('display_errors', '1');

$root = dirname(__DIR__);

require_once $root . '/config/google.php';
require_once $root . '/capabilities/google-calendar/Contracts/GoogleExceptions.php';
require_once $root . '/capabilities/google-calendar/Contracts/GoogleScopes.php';
require_once $root . '/capabilities/google-calendar/Contracts/EncryptedPayload.php';
require_once $root . '/capabilities/google-calendar/Contracts/GoogleTokenSet.php';
require_once $root . '/capabilities/google-calendar/Contracts/GoogleEventRef.php';
require_once $root . '/capabilities/google-calendar/Contracts/GoogleApiClient.php';
require_once $root . '/capabilities/google-calendar/Contracts/GoogleApiClientFactory.php';
require_once $root . '/capabilities/google-calendar/Contracts/GoogleErrorResponder.php';
require_once $root . '/capabilities/google-calendar/Services/SecretRedactor.php';
require_once $root . '/capabilities/google-calendar/Services/GoogleLog.php';
require_once $root . '/capabilities/google-calendar/Services/GoogleApiErrorMapper.php';
require_once $root . '/capabilities/google-calendar/Services/TokenCipher.php';
require_once $root . '/capabilities/google-calendar/Services/FakeGoogleApiClient.php';

final class TestRunner
{
    private int $pass = 0;
    private int $fail = 0;
    /** @var array<int,array{name:string,ok:bool,detail:string}> */
    private array $failures = [];

    public function check(string $name, bool $ok, string $detail = ''): void
    {
        if ($ok) {
            $this->pass++;
            echo "  [PASS] {$name}\n";
            return;
        }
        $this->fail++;
        $this->failures[] = ['name' => $name, 'ok' => false, 'detail' => $detail];
        echo "  [FAIL] {$name}" . ($detail !== '' ? " -- {$detail}" : '') . "\n";
    }

    public function section(string $title): void
    {
        echo "\n-- {$title} --\n";
    }

    public function summary(): int
    {
        echo "\n==============================\n";
        echo "  PASS: {$this->pass}   FAIL: {$this->fail}\n";
        echo "==============================\n";
        if ($this->fail > 0) {
            echo "\nFailures:\n";
            foreach ($this->failures as $f) {
                echo "  - {$f['name']} -- {$f['detail']}\n";
            }
            return 1;
        }
        return 0;
    }
}

function expectThrow(callable $fn): ?Throwable
{
    try {
        $fn();
        return null;
    } catch (Throwable $e) {
        return $e;
    }
}

$t = new TestRunner();

// A known-good 32-byte key, base64-encoded, distinct from any client secret.
$testKey = base64_encode(str_repeat("\x11", 32));
putenv('GOOGLE_SKIP_LOCAL_CONFIG=1'); // hermetic: ignore any gitignored local config
putenv('GOOGLE_CLIENT_ID=test-client-id');
putenv('GOOGLE_CLIENT_SECRET=test-client-secret-value');
putenv('GOOGLE_ENCRYPTION_KEY=' . $testKey);
putenv('GOOGLE_KEY_VERSION=1');

$cipher = new TokenCipher(base64_decode($testKey, true), 1);
$aad = TokenCipher::aad(1, 77, 'google', 'refresh_token');

// ---------------------------------------------------------------- 1. round trip
$t->section('1. Encryption round-trip');
$secret = '1//0eXampleRefreshToken-VALUE_with.symbols'; // refresh-token shaped
$payload = $cipher->encrypt($secret, $aad);
$t->check('ciphertext is not the plaintext', $payload->ciphertext !== $secret);
$t->check('plaintext does not appear in ciphertext', !str_contains($payload->ciphertext, 'RefreshToken'));
$t->check('payload is complete (cipher/nonce/tag/version)', $payload->isComplete());
$t->check('key version stored', $payload->keyVersion() === 1);
$t->check('nonce decodes to 12 bytes', strlen(base64_decode($payload->nonce, true)) === 12);
$t->check('tag decodes to 16 bytes', strlen(base64_decode($payload->tag, true)) === 16);
$t->check('round-trip returns the exact plaintext', $cipher->decrypt($payload, $aad) === $secret);

// ---------------------------------------------------------------- 2. random nonce
$t->section('2. Random-nonce proof (identical plaintexts)');
$p1 = $cipher->encrypt($secret, $aad);
$p2 = $cipher->encrypt($secret, $aad);
$t->check('same plaintext yields a different nonce', $p1->nonce !== $p2->nonce);
$t->check('same plaintext yields a different ciphertext', $p1->ciphertext !== $p2->ciphertext);
$t->check('same plaintext yields a different tag', $p1->tag !== $p2->tag);
$t->check('both still decrypt correctly', $cipher->decrypt($p1, $aad) === $secret && $cipher->decrypt($p2, $aad) === $secret);

// ---------------------------------------------------------------- 3. tamper detection
$t->section('3. Tamper detection');
$raw = base64_decode($payload->ciphertext, true);
$raw[0] = chr(ord($raw[0]) ^ 0x01); // flip one bit
$tamperedCipher = new EncryptedPayload(base64_encode($raw), $payload->nonce, $payload->tag, $payload->keyVersion);
$t->check('flipped ciphertext bit is rejected', expectThrow(fn() => $cipher->decrypt($tamperedCipher, $aad)) instanceof GoogleDecryptionException);

$rawTag = base64_decode($payload->tag, true);
$rawTag[0] = chr(ord($rawTag[0]) ^ 0x01);
$tamperedTag = new EncryptedPayload($payload->ciphertext, $payload->nonce, base64_encode($rawTag), $payload->keyVersion);
$t->check('flipped tag bit is rejected', expectThrow(fn() => $cipher->decrypt($tamperedTag, $aad)) instanceof GoogleDecryptionException);

$tamperedNonce = new EncryptedPayload($payload->ciphertext, base64_encode(str_repeat("\x00", 12)), $payload->tag, $payload->keyVersion);
$t->check('wrong nonce is rejected', expectThrow(fn() => $cipher->decrypt($tamperedNonce, $aad)) instanceof GoogleDecryptionException);

$t->check('incomplete payload is rejected', expectThrow(fn() => $cipher->decrypt(new EncryptedPayload('', '', '', 1), $aad)) instanceof GoogleDecryptionException);

// ---------------------------------------------------------------- 4. wrong/missing key
$t->section('4. Wrong-key and missing-key rejection');
$wrongCipher = new TokenCipher(str_repeat("\x22", 32), 1);
$t->check('a different key cannot decrypt', expectThrow(fn() => $wrongCipher->decrypt($payload, $aad)) instanceof GoogleDecryptionException);
$t->check('a short key is refused at construction', expectThrow(fn() => new TokenCipher('too-short', 1)) instanceof GoogleConfigurationException);

// ---------------------------------------------------------------- 5. key version
$t->section('5. Key-version mismatch');
$v2Cipher = new TokenCipher(base64_decode($testKey, true), 2);
$t->check('unknown key version is rejected', expectThrow(fn() => $v2Cipher->decrypt($payload, $aad)) instanceof GoogleDecryptionException);
$t->check('a v2 payload carries keyVersion 2', $v2Cipher->encrypt('x', $aad)->keyVersion() === 2);

// ---------------------------------------------------------------- 6. AAD binding
$t->section('6. AAD binding (owner/purpose isolation)');
$otherUser = TokenCipher::aad(1, 88, 'google', 'refresh_token');
$otherPurpose = TokenCipher::aad(1, 77, 'google', 'access_token');
$otherTenant = TokenCipher::aad(2, 77, 'google', 'refresh_token');
$otherProvider = TokenCipher::aad(1, 77, 'outlook', 'refresh_token');
$t->check('cannot decrypt as another user', expectThrow(fn() => $cipher->decrypt($payload, $otherUser)) instanceof GoogleDecryptionException);
$t->check('cannot decrypt as another purpose', expectThrow(fn() => $cipher->decrypt($payload, $otherPurpose)) instanceof GoogleDecryptionException);
$t->check('cannot decrypt as another tenant', expectThrow(fn() => $cipher->decrypt($payload, $otherTenant)) instanceof GoogleDecryptionException);
$t->check('cannot decrypt as another provider', expectThrow(fn() => $cipher->decrypt($payload, $otherProvider)) instanceof GoogleDecryptionException);

// ---------------------------------------------------------------- 7. no-secret logging
$t->section('7. No-secret logging (redaction)');
SecretRedactor::register('test-client-secret-value');
$samples = [
    'access' => 'Bearer ya29.a0AfH6SMBexampleAccessToken1234567890',
    'refresh' => 'refresh_token=1//0gExampleRefreshTokenABCDEF',
    'code' => 'code=4/0AX4XfWgExampleAuthCode123',
    'secret' => 'client_secret=GOCSPX-abcdef123456',
    'json' => '{"access_token":"ya29.tokenvalue","refresh_token":"1//refreshvalue","client_secret":"GOCSPX-xyz"}',
    'registered' => 'the client secret is test-client-secret-value in this line',
];
foreach ($samples as $label => $sample) {
    $redacted = SecretRedactor::redact($sample);
    $leaks = str_contains($redacted, 'ya29.')
        || str_contains($redacted, '1//')
        || str_contains($redacted, 'GOCSPX-')
        || str_contains($redacted, '4/')
        || str_contains($redacted, 'test-client-secret-value')
        || str_contains($redacted, 'tokenvalue');
    $t->check("redacts {$label} material", !$leaks, $redacted);
}
$t->check('redacted text still carries the placeholder', str_contains(SecretRedactor::redact($samples['json']), '[redacted]'));

// Capture error_log output to prove GoogleLog redacts.
$logFile = tempnam(sys_get_temp_dir(), 'glog');
ini_set('error_log', $logFile);
GoogleLog::error('Token refresh failed', [
    'access_token' => 'ya29.a0AfH6SMBleakyToken',
    'refresh_token' => '1//leakyRefresh',
    'detail' => 'code=4/leakyCode and GOCSPX-leakySecret',
]);
$logged = (string) file_get_contents($logFile);
@unlink($logFile);
$t->check('log does not contain an access token', !str_contains($logged, 'ya29.'));
$t->check('log does not contain a refresh token', !str_contains($logged, '1//leaky'));
$t->check('log does not contain an auth code', !str_contains($logged, '4/leakyCode'));
$t->check('log does not contain a client secret', !str_contains($logged, 'GOCSPX-leakySecret'));
$t->check('log contains the redaction placeholder', str_contains($logged, '[redacted]'));

// ---------------------------------------------------------------- 8. fake client mapping
$t->section('8. Fake-client error mapping');
$fake = new FakeGoogleApiClient();

$token = $fake->exchangeCode('code', 'https://example.test/cb');
$t->check('exchangeCode returns a token set', $token->isComplete());
$t->check('token jsonSerialize hides tokens', !str_contains(json_encode($token), 'ya29.'));
$t->check('userInfoEmail returns the fake email', $fake->userInfoEmail($token->accessToken) === 'connected@example.com');

$mapping = [
    'timeout' => [FakeGoogleApiClient::TIMEOUT, GoogleApiException::REASON_TIMEOUT],
    'malformed' => [FakeGoogleApiClient::MALFORMED, GoogleApiException::REASON_MALFORMED],
    'unauthorized' => [FakeGoogleApiClient::UNAUTHORIZED, GoogleApiException::REASON_UNAUTHORIZED],
    'forbidden' => [FakeGoogleApiClient::FORBIDDEN, GoogleApiException::REASON_FORBIDDEN],
    'conflict/etag' => [FakeGoogleApiClient::CONFLICT, GoogleApiException::REASON_CONFLICT],
    'rate limited' => [FakeGoogleApiClient::RATE_LIMITED, GoogleApiException::REASON_RATE_LIMITED],
    'server error' => [FakeGoogleApiClient::SERVER_ERROR, GoogleApiException::REASON_SERVER_ERROR],
    'invalid_grant' => [FakeGoogleApiClient::INVALID_GRANT, GoogleApiException::REASON_INVALID_GRANT],
];
foreach ($mapping as $label => [$outcome, $expectedReason]) {
    $client = new FakeGoogleApiClient();
    $client->failNext($outcome);
    $e = expectThrow(fn() => $client->insertEvent('primary', []));
    $t->check(
        "maps {$label} -> {$expectedReason}",
        $e instanceof GoogleApiException && $e->reason() === $expectedReason,
        $e instanceof GoogleApiException ? "got {$e->reason()}" : 'no exception',
    );
}
$t->check('invalid_grant requires reconnect', (new GoogleApiException('x', GoogleApiException::REASON_INVALID_GRANT))->requiresReconnect());
$t->check('forbidden does not require reconnect', !(new GoogleApiException('x', GoogleApiException::REASON_FORBIDDEN))->requiresReconnect());

$okClient = new FakeGoogleApiClient(meetPending: false);
$event = $okClient->insertEvent('primary', [
    'summary' => 'Session',
    'conferenceData' => ['createRequest' => ['requestId' => 'abc']],
], ['conferenceDataVersion' => 1, 'sendUpdates' => 'all']);
$t->check('insertEvent returns an id and etag', $event->eventId !== '' && $event->etag !== '');
$t->check('successful insert exposes a Meet URL', $event->meetUrl !== null);
$t->check('conferenceDataVersion forwards to the client', $okClient->inserted[0]['conferenceData']['createRequest']['requestId'] === 'abc');

$pendingClient = new FakeGoogleApiClient(meetPending: true);
$pending = $pendingClient->insertEvent('primary', ['conferenceData' => ['createRequest' => ['requestId' => 'p']]]);
$t->check('pending conference is reported as pending', $pending->conferenceStatus === 'pending');
$t->check('pending conference has no Meet URL yet', $pending->meetUrl === null);

$stale = expectThrow(fn() => $okClient->patchEvent('primary', 'e1', ['summary' => 'x'], [], '__stale__'));
$t->check('stale etag on patch maps to conflict', $stale instanceof GoogleApiException && $stale->reason() === GoogleApiException::REASON_CONFLICT);

$revokeClient = new FakeGoogleApiClient();
$revokeClient->failNext(FakeGoogleApiClient::SERVER_ERROR);
$t->check('revoke never throws (best effort)', $revokeClient->revoke('token') === false);

// ---------------------------------------------------------------- 9. config fail-closed
$t->section('9. Config fail-closed');
$t->check('google_configured() true with valid env', google_configured());
$originalKey = getenv('GOOGLE_ENCRYPTION_KEY');
putenv('GOOGLE_ENCRYPTION_KEY');
$t->check('missing key -> not configured', !google_configured());
putenv('GOOGLE_ENCRYPTION_KEY=not-base64-32-bytes');
$t->check('invalid key -> not configured', !google_configured());
putenv('GOOGLE_ENCRYPTION_KEY=' . base64_encode(str_repeat("\x33", 16)));
$t->check('16-byte key -> not configured (must be 32)', !google_configured());
putenv('GOOGLE_ENCRYPTION_KEY=' . $originalKey);
$t->check('restored key -> configured again', google_configured());
$t->check('google_config_error exposes no secret value', (function () {
    putenv('GOOGLE_CLIENT_SECRET=super-secret-xyz');
    $err = google_config_error();
    putenv('GOOGLE_CLIENT_SECRET=test-client-secret-value');
    return $err === null || !str_contains((string) $err, 'super-secret-xyz');
})());

// The redirect URI contract (config/app.php's APP_URL is resolved lazily; define it here).
if (!defined('APP_URL')) {
    define('APP_URL', 'https://app.example.test');
}
$t->check('redirect URI matches the registered path', google_redirect_uri() === 'https://app.example.test/api/api/google-calendar/commands/callback.php');

// Fail-closed fake guard: once APP_URL is a real (non-loopback) host, the offline
// fake must be REFUSED even if `use_fake` is requested. A production deploy that
// accidentally carries a local `use_fake => true` config must not select the fake.
$t->check('the fake is refused on a non-loopback host', google_fake_host_allowed() === false);
$t->check('use_fake is false on a non-loopback host even when requested', google_use_fake() === false);

// ---------------------------------------------------------------------------
// Redirect-URI regression: the OAuth callback is a top-level browser GET from
// accounts.google.com, which sends NO Origin and a Google Referer. The redirect
// URI sent to the token endpoint MUST come from the API's own host (HTTP_HOST),
// never from Origin/Referer — otherwise Google returns redirect_uri_mismatch and
// the connect fails with a generic error.
$savedHost = $_SERVER['HTTP_HOST'] ?? null;
$savedRef = $_SERVER['HTTP_REFERER'] ?? null;
$savedOrigin = $_SERVER['HTTP_ORIGIN'] ?? null;
$savedForwarded = $_SERVER['HTTP_X_FORWARDED_PROTO'] ?? null;

$_SERVER['HTTP_HOST'] = 'app.rbttacesd.co.za';
$_SERVER['HTTPS'] = 'on';
$_SERVER['HTTP_REFERER'] = 'https://accounts.google.com/';
unset($_SERVER['HTTP_ORIGIN']);
$cbUri = google_redirect_uri();
$t->check(
    'redirect URI uses the API host, not the Google callback Referer',
    $cbUri === 'https://app.rbttacesd.co.za/api/api/google-calendar/commands/callback.php',
    $cbUri
);
$t->check('redirect URI never contains accounts.google.com', !str_contains($cbUri, 'accounts.google.com'));

// A reverse proxy that terminates TLS upstream still yields https.
$_SERVER['HTTPS'] = 'off';
$_SERVER['HTTP_X_FORWARDED_PROTO'] = 'https';
$t->check(
    'redirect URI honours X-Forwarded-Proto=https',
    google_redirect_uri() === 'https://app.rbttacesd.co.za/api/api/google-calendar/commands/callback.php'
);

// An explicit config value wins and is used verbatim.
$t->check('explicit redirect_uri is used when configured', (function () {
    $defaults = google_config_defaults();
    return array_key_exists('redirect_uri', $defaults) && $defaults['redirect_uri'] === '';
})());

// Restore the request context.
if ($savedHost === null) { unset($_SERVER['HTTP_HOST']); } else { $_SERVER['HTTP_HOST'] = $savedHost; }
if ($savedRef === null) { unset($_SERVER['HTTP_REFERER']); } else { $_SERVER['HTTP_REFERER'] = $savedRef; }
if ($savedOrigin === null) { unset($_SERVER['HTTP_ORIGIN']); } else { $_SERVER['HTTP_ORIGIN'] = $savedOrigin; }
if ($savedForwarded === null) { unset($_SERVER['HTTP_X_FORWARDED_PROTO']); } else { $_SERVER['HTTP_X_FORWARDED_PROTO'] = $savedForwarded; }

exit($t->summary());
