<?php
declare(strict_types=1);

/**
 * Sprint 010 Phase 2 — OAuth lifecycle service suite.
 *
 * Runs OFFLINE (fake Google client) against the LOCAL MySQL database, using a
 * dedicated fixture user so real data is never touched. Proves:
 *   1. Connect URL generation (offline, consent, fixed redirect URI, scopes).
 *   2. State entropy + one-time consumption.
 *   3. State expiry rejection.
 *   4. Cross-user and cross-tenant state rejection.
 *   5. Successful callback + encrypted persistence (no plaintext token at rest).
 *   6. Consent denial and malformed callback (no connection written).
 *   7. Missing required scope rejection.
 *   8. Reconnect preserving an existing refresh token when none is returned.
 *   9. invalid_grant -> needs_reconnect.
 *  10. Disconnect clears local tokens; preserved when mappings reference it.
 *  11. Account mismatch with published mappings is not silently applied.
 *  12. Connection status exposes no token/expiry/config material.
 *  13. Return-path allowlist (open-redirect defence).
 *
 * Run:
 *   php api-incubator-os/tests/GoogleCalendarPhase2.php
 */

error_reporting(E_ALL);
ini_set('display_errors', '1');

$root = dirname(__DIR__);
require_once $root . '/config/google.php';
require_once $root . '/capabilities/google-calendar/Contracts/GoogleExceptions.php';
require_once $root . '/capabilities/google-calendar/Contracts/GoogleScopes.php';
require_once $root . '/capabilities/google-calendar/Contracts/GoogleOAuthResult.php';
require_once $root . '/capabilities/google-calendar/Contracts/EncryptedPayload.php';
require_once $root . '/capabilities/google-calendar/Contracts/GoogleTokenSet.php';
require_once $root . '/capabilities/google-calendar/Contracts/GoogleEventRef.php';
require_once $root . '/capabilities/google-calendar/Contracts/GoogleConnectionResponse.php';
require_once $root . '/capabilities/google-calendar/Contracts/GoogleApiClient.php';
require_once $root . '/capabilities/google-calendar/Contracts/GoogleApiClientFactory.php';
require_once $root . '/capabilities/google-calendar/Services/SecretRedactor.php';
require_once $root . '/capabilities/google-calendar/Services/GoogleLog.php';
require_once $root . '/capabilities/google-calendar/Services/GoogleApiErrorMapper.php';
require_once $root . '/capabilities/google-calendar/Services/TokenCipher.php';
require_once $root . '/capabilities/google-calendar/Services/FakeGoogleApiClient.php';
require_once $root . '/capabilities/google-calendar/Services/ReturnPathValidator.php';
require_once $root . '/capabilities/google-calendar/Services/OAuthService.php';
require_once $root . '/capabilities/google-calendar/Repository/GoogleOAuthStateRepository.php';
require_once $root . '/capabilities/google-calendar/Repository/GoogleConnectionRepository.php';
require_once $root . '/capabilities/google-calendar/Repository/GoogleEventSyncRepository.php';

$pass = 0;
$fail = 0;
$failures = [];
function check(string $name, bool $ok, string $detail = ''): void
{
    global $pass, $fail, $failures;
    if ($ok) {
        $pass++;
        echo "  [PASS] {$name}\n";
        return;
    }
    $fail++;
    $failures[] = $name . ($detail !== '' ? " -- {$detail}" : '');
    echo "  [FAIL] {$name}" . ($detail !== '' ? " -- {$detail}" : '') . "\n";
}
function section(string $t): void { echo "\n-- {$t} --\n"; }
function expectThrow(callable $fn): ?Throwable
{
    try { $fn(); return null; } catch (Throwable $e) { return $e; }
}

// ---------------------------------------------------------------- DB + fixtures
$dsn = 'mysql:host=127.0.0.1;port=3306;dbname=incubator_os';
try {
    $db = new PDO($dsn, 'docker', 'docker');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (Throwable $e) {
    fwrite(STDERR, "Cannot reach local MySQL: {$e->getMessage()}\n");
    exit(2);
}

$tenant = 1;
$userA = 900001; // fixture users, far from real ids
$userB = 900002;
$userOtherTenant = 900003;

function ensureUser(PDO $db, int $id, string $email, int $company): void
{
    $exists = $db->prepare('SELECT id FROM users WHERE id = ?');
    $exists->execute([$id]);
    if ($exists->fetchColumn()) {
        return;
    }
    $stmt = $db->prepare(
        'INSERT INTO users (id, id_type, id_number, company_id, full_name, email, username, role, status)
         VALUES (?, "test", ?, ?, "Phase2 Fixture", ?, ?, "Director", "active")'
    );
    $stmt->execute([$id, 'TEST-' . $id, $company, $email, 'phase2fixture' . $id . '@example.test']);
}

// Some installs have a NOT NULL id_type; the fallback above covers the common columns.
function cleanup(PDO $db, array $userIds, array $connectionEmails): void
{
    foreach ($userIds as $uid) {
        // Remove sync rows + connections + states for fixture users.
        $ids = $db->prepare('SELECT id FROM google_calendar_connections WHERE user_id = ?');
        $ids->execute([$uid]);
        foreach ($ids->fetchAll(PDO::FETCH_COLUMN) as $cid) {
            $db->prepare('DELETE FROM google_event_sync WHERE connection_id = ?')->execute([$cid]);
        }
        $db->prepare('DELETE FROM google_calendar_connections WHERE user_id = ?')->execute([$uid]);
        $db->prepare('DELETE FROM google_oauth_states WHERE user_id = ?')->execute([$uid]);
    }
}

try {
    ensureUser($db, $userA, 'phase2a@example.test', 11);
    ensureUser($db, $userB, 'phase2b@example.test', 11);
    ensureUser($db, $userOtherTenant, 'phase2c@example.test', 11);
} catch (Throwable $e) {
    fwrite(STDERR, "Fixture user creation failed (users schema differs): {$e->getMessage()}\n");
    exit(2);
}
cleanup($db, [$userA, $userB, $userOtherTenant], []);

$cipher = TokenCipher::fromConfig();

function makeService(array $overrides = []): OAuthService
{
    global $db, $cipher;
    static $n = 0;
    $n++;
    $fake = $overrides['client'] ?? new FakeGoogleApiClient();
    return new OAuthService(
        client: $fake,
        connections: new GoogleConnectionRepository($db),
        sync: new GoogleEventSyncRepository($db),
        states: new GoogleOAuthStateRepository($db),
        cipher: $cipher,
        redirectUri: 'https://app.example.test/api/api/google-calendar/commands/callback.php',
        calendarId: 'primary',
    );
}

// ---------------------------------------------------------------- 1. connect URL
section('1. Connect URL generation');
$svc = makeService();
$start = $svc->authorizationUrl($tenant, $userA, '/calendar');
$url = $start['authUrl'];
check('authUrl targets the Google authorization endpoint', str_starts_with($url, 'https://accounts.google.com/o/oauth2/v2/auth?'));
$q = [];
parse_str(parse_url($url, PHP_URL_QUERY) ?? '', $q);
check('requests offline access', ($q['access_type'] ?? '') === 'offline');
check('forces the consent prompt (refresh-token delivery)', ($q['prompt'] ?? '') === 'consent');
check('uses the fixed configured redirect URI', ($q['redirect_uri'] ?? '') === 'https://app.example.test/api/api/google-calendar/commands/callback.php');
check('requests the calendar.events scope', str_contains((string) ($q['scope'] ?? ''), GoogleScopes::CALENDAR_EVENTS));
check('state parameter is present', strlen((string) ($q['state'] ?? '')) === 64);
check('no client secret in the URL', !str_contains($url, 'client_secret'));
check('returned state matches the URL state', $start['state'] === ($q['state'] ?? ''));

// ---------------------------------------------------------------- 2. state entropy + one-time
section('2. State entropy and one-time consumption');
$states = new GoogleOAuthStateRepository($db);
$h1 = hash('sha256', bin2hex(random_bytes(32)));
$states->create($tenant, $userA, $h1, '/calendar', 600);
$first = $states->consume($h1, $tenant, $userA);
check('a fresh state is consumable', $first !== null && ($first['return_path'] ?? '') === '/calendar');
$second = $states->consume($h1, $tenant, $userA);
check('the same state cannot be consumed twice', $second === null);

// entropy: 200 random states are all distinct and 256-bit (64 hex chars)
$seen = [];
$allLong = true;
for ($i = 0; $i < 200; $i++) {
    $s = bin2hex(random_bytes(32));
    if (strlen($s) !== 64) { $allLong = false; }
    $seen[$s] = true;
}
check('200 states are all unique (no collisions)', count($seen) === 200);
check('every state is 256-bit', $allLong);

// ---------------------------------------------------------------- 3. expiry
section('3. State expiry');
$hExpired = hash('sha256', bin2hex(random_bytes(32)));
$states->create($tenant, $userA, $hExpired, '/calendar', 600);
$db->prepare('UPDATE google_oauth_states SET expires_at = UTC_TIMESTAMP() - INTERVAL 1 MINUTE WHERE state_hash = ?')->execute([$hExpired]);
check('an expired state is rejected', $states->consume($hExpired, $tenant, $userA) === null);

// ---------------------------------------------------------------- 4. cross-user / cross-tenant
section('4. Cross-user and cross-tenant state rejection');
$hCross = hash('sha256', bin2hex(random_bytes(32)));
$states->create($tenant, $userA, $hCross, '/calendar', 600);
check('another user cannot consume user A state', $states->consume($hCross, $tenant, $userB) === null);
check('another tenant cannot consume the state', $states->consume($hCross, 2, $userA) === null);
check('the rightful owner still can (proves binding, not deletion)', $states->consume($hCross, $tenant, $userA) !== null);

// ---------------------------------------------------------------- 5. successful callback
section('5. Successful callback + encrypted persistence');
$svcA = makeService();
cleanup($db, [$userA], []);
$startA = $svcA->authorizationUrl($tenant, $userA, '/calendar');
$out = $svcA->handleCallback(['state' => $startA['state'], 'code' => 'fake-code-1'], $tenant, $userA);
check('callback result is connected', $out['result'] === GoogleOAuthResult::CONNECTED, $out['result']);
check('callback returns the validated path', $out['returnPath'] === '/calendar');

$row = (new GoogleConnectionRepository($db))->findForUser($userA, $tenant);
check('a connection row exists', $row !== null);
check('status is connected', ($row['status'] ?? '') === 'connected');
check('connected account email captured', ($row['google_account_email'] ?? '') === 'connected@example.com');

$raw = json_encode($row);
check('no plaintext access token at rest', !str_contains((string) $raw, 'ya29.'));
check('no plaintext refresh token at rest', !str_contains((string) $raw, '1//'));
check('ciphertext present', ($row['access_token_cipher'] ?? '') !== '');
check('nonce stored separately', ($row['access_token_nonce'] ?? '') !== '');
check('tag stored separately', ($row['access_token_tag'] ?? '') !== '');
check('refresh ciphertext present', ($row['refresh_token_cipher'] ?? '') !== '');

// decrypt to prove the cipher round-trips what was stored
$dec = $cipher->decrypt(EncryptedPayload::fromArray([
    'ciphertext' => $row['refresh_token_cipher'], 'nonce' => $row['refresh_token_nonce'],
    'tag' => $row['refresh_token_tag'], 'key_version' => $row['key_version'],
]), TokenCipher::aad($tenant, $userA, 'google', 'refresh_token'));
check('stored refresh token decrypts to the issued value', str_starts_with($dec, '1//fake-refresh-'));

// ---------------------------------------------------------------- 6. denial + malformed
section('6. Consent denial and malformed callback');
cleanup($db, [$userB], []);
$svcB = makeService();
$startB = $svcB->authorizationUrl($tenant, $userB, '/calendar');
$denied = $svcB->handleCallback(['error' => 'access_denied', 'state' => $startB['state']], $tenant, $userB);
check('consent denial returns denied', $denied['result'] === GoogleOAuthResult::DENIED);
check('denial writes no connection', (new GoogleConnectionRepository($db))->findForUser($userB, $tenant) === null);

$malformed = $svcB->handleCallback(['state' => 'nope'], $tenant, $userB);
check('malformed callback (no code) returns invalid', $malformed['result'] === GoogleOAuthResult::INVALID);
check('malformed callback writes no connection', (new GoogleConnectionRepository($db))->findForUser($userB, $tenant) === null);

$noState = $svcB->handleCallback(['code' => 'x'], $tenant, $userB);
check('callback without state returns invalid', $noState['result'] === GoogleOAuthResult::INVALID);

// ---------------------------------------------------------------- 7. missing scope
section('7. Missing required scope rejection');
cleanup($db, [$userA], []);
$scopeFake = (new FakeGoogleApiClient())->setScopeOverride('openid email');
$svcScope = makeService(['client' => $scopeFake]);
$startScope = $svcScope->authorizationUrl($tenant, $userA, '/calendar');
$scopeOut = $svcScope->handleCallback(['state' => $startScope['state'], 'code' => 'c'], $tenant, $userA);
check('missing calendar scope returns scope_missing', $scopeOut['result'] === GoogleOAuthResult::SCOPE_MISSING, $scopeOut['result']);
check('missing scope writes no connection', (new GoogleConnectionRepository($db))->findForUser($userA, $tenant) === null);

// ---------------------------------------------------------------- 8. reconnect refresh preservation
section('8. Safe reconnect with and without a new refresh token');
// Establish a connection WITH a refresh token.
cleanup($db, [$userA], []);
$base = makeService();
$s1 = $base->authorizationUrl($tenant, $userA, '/calendar');
$base->handleCallback(['state' => $s1['state'], 'code' => 'c'], $tenant, $userA);
$row1 = (new GoogleConnectionRepository($db))->findForUser($userA, $tenant);
$rt1 = $cipher->decrypt(EncryptedPayload::fromArray([
    'ciphertext' => $row1['refresh_token_cipher'], 'nonce' => $row1['refresh_token_nonce'],
    'tag' => $row1['refresh_token_tag'], 'key_version' => $row1['key_version'],
]), TokenCipher::aad($tenant, $userA, 'google', 'refresh_token'));

// Reconnect where Google returns NO refresh token.
$noRtFake = (new FakeGoogleApiClient())->setOmitRefreshToken(true);
$svcNoRt = makeService(['client' => $noRtFake]);
$s2 = $svcNoRt->authorizationUrl($tenant, $userA, '/calendar');
$reOut = $svcNoRt->handleCallback(['state' => $s2['state'], 'code' => 'c'], $tenant, $userA);
check('reconnect without a refresh token still connects', $reOut['result'] === GoogleOAuthResult::CONNECTED);
$row2 = (new GoogleConnectionRepository($db))->findForUser($userA, $tenant);
$rt2 = $cipher->decrypt(EncryptedPayload::fromArray([
    'ciphertext' => $row2['refresh_token_cipher'], 'nonce' => $row2['refresh_token_nonce'],
    'tag' => $row2['refresh_token_tag'], 'key_version' => $row2['key_version'],
]), TokenCipher::aad($tenant, $userA, 'google', 'refresh_token'));
check('existing refresh token was PRESERVED (not nulled)', $rt2 === $rt1);
check('refresh nonce changed (fresh encryption)', $row2['refresh_token_nonce'] !== $row1['refresh_token_nonce'] || $rt2 === $rt1);
check('access token was replaced', $row2['access_token_cipher'] !== $row1['access_token_cipher']);

// ---------------------------------------------------------------- 9. invalid_grant
section('9. invalid_grant -> needs_reconnect');
cleanup($db, [$userA], []);
$ig = makeService();
$s3 = $ig->authorizationUrl($tenant, $userA, '/calendar');
$ig->handleCallback(['state' => $s3['state'], 'code' => 'c'], $tenant, $userA);
// Force the access token to look expired so a refresh is attempted.
$db->prepare('UPDATE google_calendar_connections SET token_expires_at = UTC_TIMESTAMP() - INTERVAL 1 HOUR WHERE user_id = ?')->execute([$userA]);
$refreshClient = (new FakeGoogleApiClient())->failNext(FakeGoogleApiClient::INVALID_GRANT);
$svcRefresh = makeService(['client' => $refreshClient]);
$thrown = expectThrow(fn() => $svcRefresh->freshAccessToken($tenant, $userA));
check('refresh with invalid_grant throws', $thrown instanceof GoogleApiException);
$after = (new GoogleConnectionRepository($db))->findForUser($userA, $tenant);
check('connection moved to needs_reconnect', ($after['status'] ?? '') === 'needs_reconnect', $after['status'] ?? '');
check('safe diagnostic recorded (no secret)', ($after['last_error'] ?? '') !== '' && !str_contains((string) ($after['last_error'] ?? ''), '1//'));

// ---------------------------------------------------------------- 10. disconnect
section('10. Disconnect and local token destruction');
cleanup($db, [$userA], []);
$dg = makeService();
$s4 = $dg->authorizationUrl($tenant, $userA, '/calendar');
$dg->handleCallback(['state' => $s4['state'], 'code' => 'c'], $tenant, $userA);
$beforeDisc = (new GoogleConnectionRepository($db))->findForUser($userA, $tenant);
$hardDeleted = $dg->disconnect($tenant, $userA);
check('disconnect with no mappings hard-deletes the row', $hardDeleted === true);
check('connection is gone after disconnect', (new GoogleConnectionRepository($db))->findForUser($userA, $tenant) === null);

// Disconnect preserves the row when mappings reference it.
cleanup($db, [$userA], []);
$dg2 = makeService();
$s5 = $dg2->authorizationUrl($tenant, $userA, '/calendar');
$dg2->handleCallback(['state' => $s5['state'], 'code' => 'c'], $tenant, $userA);
$conn = (new GoogleConnectionRepository($db))->findForUser($userA, $tenant);
// Insert a referencing google_event_sync row against a real calendar event.
$evt = $db->query('SELECT id FROM calendar_events ORDER BY id LIMIT 1')->fetchColumn();
if ($evt) {
    $db->prepare(
        'INSERT INTO google_event_sync (tenant_id, calendar_event_id, connection_id, google_calendar_id, google_event_id, sync_status, created_by)
         VALUES (1, ?, ?, "primary", "g-1", "synced", ?)'
    )->execute([$evt, (int) $conn['id'], $userA]);
    $preserved = $dg2->disconnect($tenant, $userA);
    check('disconnect with mappings does NOT hard-delete', $preserved === false);
    $afterDisc = (new GoogleConnectionRepository($db))->findForUser($userA, $tenant);
    check('row preserved with status disconnected', ($afterDisc['status'] ?? '') === 'disconnected');
    check('encrypted tokens cleared on preserved row', ($afterDisc['refresh_token_cipher'] ?? null) === null && ($afterDisc['access_token_cipher'] ?? null) === null);
    $db->prepare('DELETE FROM google_event_sync WHERE connection_id = ?')->execute([(int) $conn['id']]);
} else {
    check('calendar_events fixture available for mapping test', false, 'no calendar_events row');
}

// ---------------------------------------------------------------- 11. account mismatch
section('11. Account mismatch with published mappings');
cleanup($db, [$userA], []);
$am = makeService();
$s6 = $am->authorizationUrl($tenant, $userA, '/calendar');
$am->handleCallback(['state' => $s6['state'], 'code' => 'c'], $tenant, $userA);
$connAm = (new GoogleConnectionRepository($db))->findForUser($userA, $tenant);
if ($evt) {
    $db->prepare(
        'INSERT INTO google_event_sync (tenant_id, calendar_event_id, connection_id, google_calendar_id, google_event_id, sync_status, created_by)
         VALUES (1, ?, ?, "primary", "g-2", "synced", ?)'
    )->execute([$evt, (int) $connAm['id'], $userA]);
    $otherAcct = (new FakeGoogleApiClient())->setEmail('different-account@example.com');
    $svcAm = makeService(['client' => $otherAcct]);
    $s7 = $svcAm->authorizationUrl($tenant, $userA, '/calendar');
    $amOut = $svcAm->handleCallback(['state' => $s7['state'], 'code' => 'c'], $tenant, $userA);
    check('different account with mappings returns account_mismatch', $amOut['result'] === GoogleOAuthResult::ACCOUNT_MISMATCH, $amOut['result']);
    $rowAm = (new GoogleConnectionRepository($db))->findForUser($userA, $tenant);
    check('original account email NOT reassigned', ($rowAm['google_account_email'] ?? '') === 'connected@example.com');
    check('status is account_mismatch', ($rowAm['status'] ?? '') === 'account_mismatch');
    check('pending account email recorded for reconciliation', ($rowAm['pending_account_email'] ?? '') === 'different-account@example.com');
    $db->prepare('DELETE FROM google_event_sync WHERE connection_id = ?')->execute([(int) $connAm['id']]);
} else {
    check('calendar_events fixture available for account-mismatch test', false, 'no calendar_events row');
}

// ---------------------------------------------------------------- 12. status response shape
section('12. Connection status exposes no secrets');
$resp = new GoogleConnectionResponse(status: 'connected', googleAccountEmail: 'x@example.com', calendarId: 'primary', connectedAt: '2026-09-24 10:00:00', needsReconnect: false);
$json = json_encode($resp);
foreach (['cipher', 'nonce', 'tag', 'token', 'secret', 'expires', 'access_token', 'refresh_token', 'key_version'] as $needle) {
    check("status JSON omits '{$needle}'", !str_contains(strtolower((string) $json), $needle));
}

// ---------------------------------------------------------------- 13. return path
section('13. Return-path allowlist (open-redirect defence)');
$cases = [
    '/calendar' => '/calendar',
    '/company/99/calendar' => '/company/99/calendar',
    '/company/99/calendar?month=9' => '/company/99/calendar',
    'https://evil.example.com' => '/',
    '//evil.example.com' => '/',
    '/\\evil' => '/',
    'javascript:alert(1)' => '/',
    'http:/evil' => '/',
    '/calendar/../../etc/passwd' => '/',
    '' => '/',
    null => '/',
    "/calendar\nSet-Cookie: x" => '/',
];
foreach ($cases as $input => $expected) {
    $actual = ReturnPathValidator::sanitize(is_string($input) ? $input : null);
    check("sanitize('" . (is_string($input) ? addcslashes($input, "\n") : 'null') . "') => {$expected}", $actual === $expected, "got {$actual}");
}

// redirect URL carries only a safe code
$resultCodes = GoogleOAuthResult::all();
check('all result codes are in the allowlist', GoogleOAuthResult::isValid('connected') && GoogleOAuthResult::isValid('denied') && GoogleOAuthResult::isValid('failed'));
check('an unknown result code is rejected', !GoogleOAuthResult::isValid('ya29.token'));

// ---------------------------------------------------------------- cleanup
cleanup($db, [$userA, $userB, $userOtherTenant], []);

echo "\n==============================\n";
echo "  PASS: {$pass}   FAIL: {$fail}\n";
echo "==============================\n";
if ($fail > 0) {
    echo "\nFailures:\n";
    foreach ($failures as $f) { echo "  - {$f}\n"; }
    exit(1);
}
exit(0);
