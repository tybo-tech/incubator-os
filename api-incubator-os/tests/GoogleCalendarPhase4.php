<?php
declare(strict_types=1);

/**
 * Sprint 010 Phase 4 — reschedule, cancellation cascade, conflict, unpublish.
 *
 * Runs OFFLINE (fake Google client) against the LOCAL MySQL database with
 * dedicated fixture rows, so real data is never touched. Proves:
 *
 *   1. Successful timed and all-day reschedule (same event, etag advances).
 *   2. Meet/conference data preserved on PATCH (no conferenceData key sent).
 *   3. Etag updated after success.
 *   4. 412 -> conflict, with both etags, and NO overwrite of local data.
 *   5. Timeout/429/5xx -> retryable `update_pending`.
 *   6. Refresh once; no 401 loop.
 *   7. invalid_grant -> needs_reconnect, local change retained.
 *   8. Session cancellation cascades locally and remotely.
 *   9. Remote 404/410 cancellation idempotency.
 *  10. Unpublish preserves internal records and audit; row kept as `unpublished`.
 *  11. Republish uses a new safe generation (new id + new conference request id).
 *  12. Race scenarios: publish-in-flight vs reschedule/cancel; unpublish vs
 *      pending update; two concurrent reschedules; cancel after conflict; token
 *      expiry during patch/delete; local update after payload prepared.
 *  13. Idempotent reschedule sends no second email.
 *
 * Run:
 *   php api-incubator-os/tests/GoogleCalendarPhase4.php
 */

error_reporting(E_ALL);
ini_set('display_errors', '1');

$root = dirname(__DIR__);
require_once $root . '/config/app.php';
require_once $root . '/config/google.php';
require_once $root . '/helpers/AuthGuard.php';
require_once $root . '/capabilities/google-calendar/Contracts/GoogleExceptions.php';
require_once $root . '/capabilities/google-calendar/Contracts/GoogleScopes.php';
require_once $root . '/capabilities/google-calendar/Contracts/GoogleOAuthResult.php';
require_once $root . '/capabilities/google-calendar/Contracts/EncryptedPayload.php';
require_once $root . '/capabilities/google-calendar/Contracts/GoogleTokenSet.php';
require_once $root . '/capabilities/google-calendar/Contracts/GoogleEventRef.php';
require_once $root . '/capabilities/google-calendar/Contracts/GoogleConnectionResponse.php';
require_once $root . '/capabilities/google-calendar/Contracts/GoogleEventSyncResponse.php';
require_once $root . '/capabilities/google-calendar/Contracts/GoogleApiClient.php';
require_once $root . '/capabilities/google-calendar/Contracts/GoogleApiClientFactory.php';
require_once $root . '/capabilities/google-calendar/Services/SecretRedactor.php';
require_once $root . '/capabilities/google-calendar/Services/GoogleLog.php';
require_once $root . '/capabilities/google-calendar/Services/GoogleApiErrorMapper.php';
require_once $root . '/capabilities/google-calendar/Services/TokenCipher.php';
require_once $root . '/capabilities/google-calendar/Services/FakeGoogleApiClient.php';
require_once $root . '/capabilities/google-calendar/Services/ReturnPathValidator.php';
require_once $root . '/capabilities/google-calendar/Services/GoogleAccessPolicy.php';
require_once $root . '/capabilities/google-calendar/Services/OAuthService.php';
require_once $root . '/capabilities/google-calendar/Services/GoogleEventMapper.php';
require_once $root . '/capabilities/google-calendar/Services/GoogleSessionContext.php';
require_once $root . '/capabilities/google-calendar/Services/GoogleAttendeeResolver.php';
require_once $root . '/capabilities/google-calendar/Services/GoogleEventSyncService.php';
require_once $root . '/capabilities/google-calendar/Repository/GoogleOAuthStateRepository.php';
require_once $root . '/capabilities/google-calendar/Repository/GoogleConnectionRepository.php';
require_once $root . '/capabilities/google-calendar/Repository/GoogleEventSyncRepository.php';
require_once $root . '/capabilities/calendar/Contracts/GoogleEventSyncHook.php';
require_once $root . '/capabilities/google-calendar/Services/GoogleCancelHook.php';

$pass = 0;
$fail = 0;
$failures = [];
function check(string $name, bool $ok, string $detail = ''): void
{
    global $pass, $fail, $failures;
    if ($ok) { $pass++; echo "  [PASS] {$name}\n"; return; }
    $fail++;
    $failures[] = $name . ($detail !== '' ? " -- {$detail}" : '');
    echo "  [FAIL] {$name}" . ($detail !== '' ? " -- {$detail}" : '') . "\n";
}
function section(string $t): void { echo "\n-- {$t} --\n"; }
function expectThrow(callable $fn): ?Throwable
{
    try { $fn(); return null; } catch (Throwable $e) { return $e; }
}

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
$company = 900033;
$actor = 920001;

$createdEvents = [];
$createdSessions = [];

function ensureCompany(PDO $db, int $id, string $name): void
{
    $s = $db->prepare('SELECT id FROM companies WHERE id = ?');
    $s->execute([$id]);
    if (!$s->fetchColumn()) {
        $db->prepare('INSERT INTO companies (id, name) VALUES (?, ?)')->execute([$id, $name]);
    }
}

function ensureUser(PDO $db, int $id, string $email, int $company, string $role = 'Director'): void
{
    $s = $db->prepare('SELECT id FROM users WHERE id = ?');
    $s->execute([$id]);
    if ($s->fetchColumn()) {
        $db->prepare('UPDATE users SET email=?, company_id=?, role=?, status=\'active\' WHERE id=?')->execute([$email, $company, $role, $id]);
        return;
    }
    $db->prepare(
        'INSERT INTO users (id, id_type, id_number, company_id, full_name, email, username, role, status)
         VALUES (?, "test", ?, ?, ?, ?, ?, ?, "active")'
    )->execute([$id, 'TEST-' . $id, $company, 'Phase4 Fixture', $email, 'phase4fix' . $id . '@example.test', $role]);
}

function makeEvent(PDO $db, array $overrides): int
{
    $data = array_merge([
        'tenant_id' => 1, 'company_id' => null, 'created_by' => 920001,
        'title' => 'Phase4 Event', 'category' => 'meeting', 'status' => 'scheduled',
        'all_day' => 0, 'timezone' => 'Africa/Johannesburg', 'location' => null,
        'start_date' => null, 'end_date' => null,
        'start_at' => '2026-10-15 07:30:00', 'end_at' => '2026-10-15 08:30:00',
    ], $overrides);
    $db->prepare(
        'INSERT INTO calendar_events
            (tenant_id, company_id, created_by, title, description, category, status, all_day, timezone, location,
             start_date, end_date, start_at, end_at, version)
         VALUES (:tenant_id, :company_id, :created_by, :title, :description, :category, :status, :all_day, :timezone, :location,
             :start_date, :end_date, :start_at, :end_at, 1)'
    )->execute([
        'tenant_id' => $data['tenant_id'], 'company_id' => $data['company_id'], 'created_by' => $data['created_by'],
        'title' => $data['title'], 'description' => $data['description'] ?? null,
        'category' => $data['category'], 'status' => $data['status'], 'all_day' => $data['all_day'] ? 1 : 0,
        'timezone' => $data['timezone'], 'location' => $data['location'],
        'start_date' => $data['start_date'], 'end_date' => $data['end_date'],
        'start_at' => $data['start_at'], 'end_at' => $data['end_at'],
    ]);
    return (int) $db->lastInsertId();
}

function actorRow(PDO $db, int $id): array
{
    $s = $db->prepare('SELECT * FROM users WHERE id = ?');
    $s->execute([$id]);
    return $s->fetch(PDO::FETCH_ASSOC) ?: [];
}

function eventRow(PDO $db, int $id): array
{
    $s = $db->prepare('SELECT e.* FROM calendar_events e WHERE e.id = ?');
    $s->execute([$id]);
    return $s->fetch(PDO::FETCH_ASSOC) ?: [];
}

function makeOAuth(PDO $db, FakeGoogleApiClient $client): OAuthService
{
    return new OAuthService(
        client: $client,
        connections: new GoogleConnectionRepository($db),
        sync: new GoogleEventSyncRepository($db),
        states: new GoogleOAuthStateRepository($db),
        cipher: TokenCipher::fromConfig(),
        redirectUri: 'https://app.example.test/api/api/google-calendar/commands/callback.php',
        calendarId: 'primary',
    );
}

function makeService(PDO $db, FakeGoogleApiClient $client, GoogleAccessPolicy $policy): GoogleEventSyncService
{
    return new GoogleEventSyncService(
        client: $client,
        connections: new GoogleConnectionRepository($db),
        sync: new GoogleEventSyncRepository($db),
        oauth: makeOAuth($db, $client),
        mapper: new GoogleEventMapper(),
        attendees: new GoogleAttendeeResolver($db),
        sessions: new GoogleSessionContext($db),
        policy: $policy,
    );
}

function connectUser(PDO $db, FakeGoogleApiClient $client, int $userId, int $tenant, string $email): void
{
    $oauth = makeOAuth($db, $client);
    $start = $oauth->authorizationUrl($tenant, $userId, '/calendar');
    $client->setEmail($email);
    $out = $oauth->handleCallback(['state' => $start['state'], 'code' => 'c'], $tenant, $userId);
    if ($out['result'] !== GoogleOAuthResult::CONNECTED) {
        throw new RuntimeException('Fixture connect failed: ' . $out['result']);
    }
}

function cleanup(PDO $db, array $userIds, array &$eventIds, array &$sessionIds): void
{
    foreach ($sessionIds as $sid) {
        $db->prepare('DELETE FROM session_participants WHERE session_id = ?')->execute([$sid]);
        $db->prepare('DELETE FROM sessions WHERE id = ?')->execute([$sid]);
    }
    $sessionIds = [];
    foreach ($eventIds as $eid) {
        $db->prepare('DELETE FROM google_event_sync WHERE calendar_event_id = ?')->execute([$eid]);
        $db->prepare('DELETE FROM calendar_events WHERE id = ?')->execute([$eid]);
    }
    $eventIds = [];
    foreach ($userIds as $uid) {
        $ids = $db->prepare('SELECT id FROM google_calendar_connections WHERE user_id = ?');
        $ids->execute([$uid]);
        foreach ($ids->fetchAll(PDO::FETCH_COLUMN) as $cid) {
            $db->prepare('DELETE FROM google_event_sync WHERE connection_id = ?')->execute([$cid]);
        }
        $db->prepare('DELETE FROM google_calendar_connections WHERE user_id = ?')->execute([$uid]);
        $db->prepare('DELETE FROM google_oauth_states WHERE user_id = ?')->execute([$uid]);
    }
}

ensureCompany($db, $company, 'Phase4 Company');
ensureUser($db, $actor, 'phase4.actor@example.test', $company);
$policy = new GoogleAccessPolicy(actorRow($db, $actor));
cleanup($db, [$actor], $createdEvents, $createdSessions);

function publishFixture(PDO $db, FakeGoogleApiClient $client, int $tenant, array $eventRow, GoogleAccessPolicy $policy): array
{
    $svc = makeService($db, $client, $policy);
    $res = $svc->publish($eventRow);
    return [$svc, $res];
}

// ================================================================ 1. reschedule
section('1. Successful timed reschedule');
$c1 = new FakeGoogleApiClient();
connectUser($db, $c1, $actor, $tenant, 'organiser@example.test');
$ev1 = makeEvent($db, ['company_id' => $company, 'title' => 'Reschedule me']);
$createdEvents[] = $ev1;
[$svc1, $pub1] = publishFixture($db, $c1, $tenant, eventRow($db, $ev1), $policy);
$etagBefore = (new GoogleEventSyncRepository($db))->findByCalendarEvent($ev1, $tenant)['etag'];

// Reschedule locally: move to 10:00 and bump version.
$db->prepare('UPDATE calendar_events SET start_at="2026-10-15 08:00:00", end_at="2026-10-15 09:00:00", version=version+1 WHERE id=?')->execute([$ev1]);
$sync1 = $svc1->sync(eventRow($db, $ev1));
check('reschedule reports synced', $sync1->syncStatus === 'synced', $sync1->syncStatus);
check('reschedule advanced the etag', $sync1->version > 0);
$row1 = (new GoogleEventSyncRepository($db))->findByCalendarEvent($ev1, $tenant);
check('etag changed after reschedule', ($row1['etag'] ?? '') !== $etagBefore, (string) $row1['etag']);
check('the Google event id is unchanged (same event)', ($row1['google_event_id'] ?? '') === ($pub1->googleEventId ?? ''));
check('synced_event_version tracks the local version', (int) ($row1['synced_event_version'] ?? 0) === (int) eventRow($db, $ev1)['version']);
check('the patch went through PATCH (recorded)', count($c1->patched) === 1);
check('exactly one Google event exists across reschedule', count($c1->inserted) === 1);

// The patch must NOT include conferenceData (preserve the Meet conference).
$patch = $c1->patched[0] ?? [];
check('the reschedule PATCH carries no conferenceData key', !array_key_exists('conferenceData', $patch));
check('the reschedule PATCH carries no id (PATCH not replace)', !array_key_exists('id', $patch));
check('the reschedule PATCH includes the managed time fields', isset($patch['start'], $patch['end']));

// ================================================================ 2. idempotent
section('2. Idempotent repeat reschedule (no second email)');
$patchedBefore = count($c1->patched);
$sync1b = $svc1->sync(eventRow($db, $ev1));
check('repeat sync reports synced', $sync1b->syncStatus === 'synced');
check('repeat sync did NOT call Google again', count($c1->patched) === $patchedBefore, (string) count($c1->patched));

// ================================================================ 3. all-day
section('3. All-day reschedule preserves the exclusive end');
$c3 = new FakeGoogleApiClient();
connectUser($db, $c3, $actor, $tenant, 'organiser@example.test');
$ev3 = makeEvent($db, ['company_id' => $company, 'title' => 'All day', 'all_day' => 1, 'timezone' => null, 'start_date' => '2026-10-15', 'end_date' => '2026-10-15', 'start_at' => null, 'end_at' => null]);
$createdEvents[] = $ev3;
[$svc3] = publishFixture($db, $c3, $tenant, eventRow($db, $ev3), $policy);
check('all-day insert end is exclusive', ($c3->inserted[0]['end']['date'] ?? '') === '2026-10-16');
$db->prepare('UPDATE calendar_events SET end_date="2026-10-17", version=version+1 WHERE id=?')->execute([$ev3]);
$svc3->sync(eventRow($db, $ev3));
check('all-day patch end is exclusive after reschedule', ($c3->patched[0]['end']['date'] ?? '') === '2026-10-18', (string) ($c3->patched[0]['end']['date'] ?? ''));

// ================================================================ 4. conflict
section('4. 412 -> conflict, no overwrite');
$c4 = new FakeGoogleApiClient();
connectUser($db, $c4, $actor, $tenant, 'organiser@example.test');
$ev4 = makeEvent($db, ['company_id' => $company, 'title' => 'Conflict event']);
$createdEvents[] = $ev4;
[$svc4] = publishFixture($db, $c4, $tenant, eventRow($db, $ev4), $policy);
$googleId4 = (new GoogleEventSyncRepository($db))->findByCalendarEvent($ev4, $tenant)['google_event_id'];
// A third party edits the Google event: the remote etag moves.
$c4->simulateExternalEdit($googleId4);
// Local reschedule bumps the version so a sync is attempted with the stale etag.
$db->prepare('UPDATE calendar_events SET title="Local wins", version=version+1 WHERE id=?')->execute([$ev4]);
$t4 = expectThrow(fn() => $svc4->sync(eventRow($db, $ev4)));
check('a Google-side edit surfaces as a conflict', $t4 instanceof GoogleSyncConflictException, get_class((object) $t4));
$row4 = (new GoogleEventSyncRepository($db))->findByCalendarEvent($ev4, $tenant);
check('sync_status is conflict', ($row4['sync_status'] ?? '') === 'conflict', (string) ($row4['sync_status'] ?? ''));
check('the last known local etag is preserved', ($row4['etag'] ?? '') !== '');
check('the current remote etag is recorded', ($row4['remote_etag'] ?? '') !== '' && ($row4['remote_etag'] ?? '') !== ($row4['etag'] ?? ''));
check('conflict_at is recorded', ($row4['conflict_at'] ?? null) !== null);
// A conflict must KEEP the known Google/Meet links so the UI can offer
// "Open Google Calendar" without a destructive retry.
check('a conflict preserves the Google event url', ($row4['google_event_url'] ?? null) !== null);
check('a conflict preserves the Meet url', ($row4['meet_url'] ?? null) !== null);
check('the local title was NOT overwritten by Google', (string) eventRow($db, $ev4)['title'] === 'Local wins');
// No snapshot columns exist to hold attendee/description data.
$cols = $db->query('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME="google_event_sync"')->fetchAll(PDO::FETCH_COLUMN);
check('no external-snapshot column exists', !in_array('snapshot', array_map('strtolower', $cols), true) && !in_array('remote_snapshot', array_map('strtolower', $cols), true));

// ================================================================ 5. transient
section('5. Transient failure -> retryable update_pending');
$c5 = new FakeGoogleApiClient();
connectUser($db, $c5, $actor, $tenant, 'organiser@example.test');
$ev5 = makeEvent($db, ['company_id' => $company, 'title' => 'Transient']);
$createdEvents[] = $ev5;
[$svc5] = publishFixture($db, $c5, $tenant, eventRow($db, $ev5), $policy);
$db->prepare('UPDATE calendar_events SET title="Changed", version=version+1 WHERE id=?')->execute([$ev5]);
$c5->failNext(FakeGoogleApiClient::TIMEOUT);
$r5 = $svc5->sync(eventRow($db, $ev5));
check('a timeout yields update_pending', $r5->syncStatus === 'update_pending', $r5->syncStatus);
check('the timeout is not a hard failure status', $r5->syncStatus !== 'failed');
$row5 = (new GoogleEventSyncRepository($db))->findByCalendarEvent($ev5, $tenant);
check('the local change is retained (identifiers intact)', ($row5['google_event_id'] ?? '') !== '');

$c5->failNext(FakeGoogleApiClient::RATE_LIMITED);
$r5b = $svc5->sync(eventRow($db, $ev5));
check('a 429 also yields update_pending', $r5b->syncStatus === 'update_pending', $r5b->syncStatus);

$c5->failNext(FakeGoogleApiClient::SERVER_ERROR);
$r5c = $svc5->sync(eventRow($db, $ev5));
check('a 5xx also yields update_pending', $r5c->syncStatus === 'update_pending', $r5c->syncStatus);

$r5d = $svc5->sync(eventRow($db, $ev5));
check('a later retry succeeds', $r5d->syncStatus === 'synced', $r5d->syncStatus);

// ================================================================ 6. refresh once
section('6. Refresh once, no 401 loop, invalid_grant -> needs_reconnect');
$c6 = new FakeGoogleApiClient();
connectUser($db, $c6, $actor, $tenant, 'organiser@example.test');
$ev6 = makeEvent($db, ['company_id' => $company, 'title' => 'Refresh']);
$createdEvents[] = $ev6;
[$svc6] = publishFixture($db, $c6, $tenant, eventRow($db, $ev6), $policy);
$db->prepare('UPDATE calendar_events SET title="Moved", version=version+1 WHERE id=?')->execute([$ev6]);
$db->prepare('UPDATE google_calendar_connections SET token_expires_at = UTC_TIMESTAMP() - INTERVAL 1 HOUR WHERE user_id=?')->execute([$actor]);
$refreshesBefore = $c6->refreshCalls;
$r6 = $svc6->sync(eventRow($db, $ev6));
check('sync refreshes then succeeds', $r6->syncStatus === 'synced', $r6->syncStatus);
check('exactly one refresh for the sync', ($c6->refreshCalls - $refreshesBefore) === 1, (string) ($c6->refreshCalls - $refreshesBefore));

// 401 after refresh: stop, no loop.
$c6b = new FakeGoogleApiClient();
connectUser($db, $c6b, $actor, $tenant, 'organiser@example.test');
$ev6b = makeEvent($db, ['company_id' => $company, 'title' => '401 patch']);
$createdEvents[] = $ev6b;
[$svc6b] = publishFixture($db, $c6b, $tenant, eventRow($db, $ev6b), $policy);
$db->prepare('UPDATE calendar_events SET title="Moved2", version=version+1 WHERE id=?')->execute([$ev6b]);
$db->prepare('UPDATE google_calendar_connections SET token_expires_at = UTC_TIMESTAMP() - INTERVAL 1 HOUR WHERE user_id=?')->execute([$actor]);
$ref6b = $c6b->refreshCalls;
$c6b->failNext(FakeGoogleApiClient::SUCCESS, FakeGoogleApiClient::UNAUTHORIZED); // refresh ok, patch 401
$t6b = expectThrow(fn() => $svc6b->sync(eventRow($db, $ev6b)));
check('a 401 after refresh surfaces', $t6b instanceof GoogleApiException);
check('the refresh loop did not retry', ($c6b->refreshCalls - $ref6b) === 1, (string) ($c6b->refreshCalls - $ref6b));

// invalid_grant -> needs_reconnect, local change retained.
$c6c = new FakeGoogleApiClient();
connectUser($db, $c6c, $actor, $tenant, 'organiser@example.test');
$ev6c = makeEvent($db, ['company_id' => $company, 'title' => 'invalid_grant patch']);
$createdEvents[] = $ev6c;
[$svc6c] = publishFixture($db, $c6c, $tenant, eventRow($db, $ev6c), $policy);
$db->prepare('UPDATE calendar_events SET title="Moved3", version=version+1 WHERE id=?')->execute([$ev6c]);
$db->prepare('UPDATE google_calendar_connections SET token_expires_at = UTC_TIMESTAMP() - INTERVAL 1 HOUR WHERE user_id=?')->execute([$actor]);
$c6c->failNext(FakeGoogleApiClient::INVALID_GRANT);
$t6c = expectThrow(fn() => $svc6c->sync(eventRow($db, $ev6c)));
check('invalid_grant during sync surfaces', $t6c instanceof GoogleApiException);
$conn6c = (new GoogleConnectionRepository($db))->findForUser($actor, $tenant);
check('invalid_grant flips the connection to needs_reconnect', ($conn6c['status'] ?? '') === 'needs_reconnect');
$row6c = (new GoogleEventSyncRepository($db))->findByCalendarEvent($ev6c, $tenant);
check('the local change is retained as retryable', in_array(($row6c['sync_status'] ?? ''), ['update_pending', 'failed'], true), (string) ($row6c['sync_status'] ?? ''));
check('the local title is untouched', (string) eventRow($db, $ev6c)['title'] === 'Moved3');

// Reset connection for subsequent tests.
$db->prepare('UPDATE google_calendar_connections SET status="connected" WHERE user_id=?')->execute([$actor]);

// ================================================================ 7. cancel
section('7. Cancellation cascade');
$c7 = new FakeGoogleApiClient();
connectUser($db, $c7, $actor, $tenant, 'organiser@example.test');
$ev7 = makeEvent($db, ['company_id' => $company, 'title' => 'Cancel me']);
$createdEvents[] = $ev7;
[$svc7] = publishFixture($db, $c7, $tenant, eventRow($db, $ev7), $policy);
$googleId7 = (new GoogleEventSyncRepository($db))->findByCalendarEvent($ev7, $tenant)['google_event_id'];
// Cancel locally then cancel the projection.
$db->prepare('UPDATE calendar_events SET status="cancelled", version=version+1 WHERE id=?')->execute([$ev7]);
$r7 = $svc7->sync(eventRow($db, $ev7)); // a cancelled event delegates to cancel
check('syncing a cancelled event deletes remotely', count($c7->deleted) === 1);
check('the Google event deleted is the published one', ($c7->deleted[0] ?? '') === $googleId7);
$row7 = (new GoogleEventSyncRepository($db))->findByCalendarEvent($ev7, $tenant);
check('sync_status becomes detached', ($row7['sync_status'] ?? '') === 'detached', (string) ($row7['sync_status'] ?? ''));
check('the active google_event_id is cleared', ($row7['google_event_id'] ?? null) === null);
check('the last google_event_id is retained for audit', ($row7['last_google_event_id'] ?? '') === $googleId7);
check('the remote outcome is deleted', ($row7['remote_outcome'] ?? '') === 'deleted');
check('the local event is untouched by the remote cancel', (string) eventRow($db, $ev7)['status'] === 'cancelled');

// Repeated cancellation is idempotent (no second delete).
$r7b = $svc7->cancelEvent(eventRow($db, $ev7));
check('a repeat cancellation is a clean no-op', count($c7->deleted) === 1, (string) count($c7->deleted));

// 404/410 idempotency.
$c7g = new FakeGoogleApiClient();
connectUser($db, $c7g, $actor, $tenant, 'organiser@example.test');
$ev7g = makeEvent($db, ['company_id' => $company, 'title' => 'Gone remotely']);
$createdEvents[] = $ev7g;
$svc7g = makeService($db, $c7g, $policy);
$svc7g->publish(eventRow($db, $ev7g));
$c7g->failNext(FakeGoogleApiClient::NOT_FOUND);
$gOut = $svc7g->cancelEvent(eventRow($db, $ev7g));
$row7g = (new GoogleEventSyncRepository($db))->findByCalendarEvent($ev7g, $tenant);
check('a 404 on cancel is treated as success', ($row7g['sync_status'] ?? '') === 'detached');
check('a 404 records already_absent', ($row7g['remote_outcome'] ?? '') === 'already_absent');
check('a 404 cancel does not throw', true);

$c7h = new FakeGoogleApiClient();
connectUser($db, $c7h, $actor, $tenant, 'organiser@example.test');
$ev7h = makeEvent($db, ['company_id' => $company, 'title' => 'Gone 410']);
$createdEvents[] = $ev7h;
$svc7h = makeService($db, $c7h, $policy);
$svc7h->publish(eventRow($db, $ev7h));
$c7h->failNext(FakeGoogleApiClient::GONE);
$svc7h->cancelEvent(eventRow($db, $ev7h));
$row7h = (new GoogleEventSyncRepository($db))->findByCalendarEvent($ev7h, $tenant);
check('a 410 on cancel is treated as success', ($row7h['sync_status'] ?? '') === 'detached');
check('a 410 records already_absent', ($row7h['remote_outcome'] ?? '') === 'already_absent');

// Best-effort: a Google failure leaves the local cancellation and a pending state.
$c7f = new FakeGoogleApiClient();
connectUser($db, $c7f, $actor, $tenant, 'organiser@example.test');
$ev7f = makeEvent($db, ['company_id' => $company, 'title' => 'Cancel fails']);
$createdEvents[] = $ev7f;
$svc7f = makeService($db, $c7f, $policy);
$svc7f->publish(eventRow($db, $ev7f));
$db->prepare('UPDATE calendar_events SET status="cancelled", version=version+1 WHERE id=?')->execute([$ev7f]);
$c7f->failNext(FakeGoogleApiClient::SERVER_ERROR);
$r7f = $svc7f->sync(eventRow($db, $ev7f));
check('a Google failure during cancel does not throw', true);
check('the local event stays cancelled', (string) eventRow($db, $ev7f)['status'] === 'cancelled');
$row7f = (new GoogleEventSyncRepository($db))->findByCalendarEvent($ev7f, $tenant);
check('the external cancellation is marked retryable', ($row7f['sync_status'] ?? '') === 'update_pending', (string) ($row7f['sync_status'] ?? ''));
check('the identifiers are retained for retry', ($row7f['google_event_id'] ?? '') !== '');

// ================================================================ 8. unpublish
section('8. Unpublish preserves local records and audit');
$c8 = new FakeGoogleApiClient();
connectUser($db, $c8, $actor, $tenant, 'organiser@example.test');
$ev8 = makeEvent($db, ['company_id' => $company, 'title' => 'Unpublish me']);
$createdEvents[] = $ev8;
$svc8 = makeService($db, $c8, $policy);
$svc8->publish(eventRow($db, $ev8));
$googleId8 = (new GoogleEventSyncRepository($db))->findByCalendarEvent($ev8, $tenant)['google_event_id'];
$u8 = $svc8->unpublish(eventRow($db, $ev8));
check('unpublish deletes the remote event', in_array($googleId8, $c8->deleted, true));
check('unpublish retains the local event', eventRow($db, $ev8) !== []);
$row8 = (new GoogleEventSyncRepository($db))->findByCalendarEvent($ev8, $tenant);
check('the sync row is NOT deleted', $row8 !== null);
check('sync_status is unpublished', ($row8['sync_status'] ?? '') === 'unpublished', (string) ($row8['sync_status'] ?? ''));
check('unpublished_at is recorded', ($row8['unpublished_at'] ?? null) !== null);
check('the remote outcome is deleted', ($row8['remote_outcome'] ?? '') === 'deleted');
check('the active links are cleared on success', ($row8['google_event_id'] ?? null) === null && ($row8['meet_url'] ?? null) === null);
check('the last google id is retained', ($row8['last_google_event_id'] ?? '') === $googleId8);

// Repeated unpublish is idempotent.
$u8b = $svc8->unpublish(eventRow($db, $ev8));
check('a repeat unpublish is a clean no-op', count($c8->deleted) === 1, (string) count($c8->deleted));

// Unpublish failure keeps the mapping active and retryable; links NOT cleared.
$c8f = new FakeGoogleApiClient();
connectUser($db, $c8f, $actor, $tenant, 'organiser@example.test');
$ev8f = makeEvent($db, ['company_id' => $company, 'title' => 'Unpublish fails']);
$createdEvents[] = $ev8f;
$svc8f = makeService($db, $c8f, $policy);
$svc8f->publish(eventRow($db, $ev8f));
$c8f->failNext(FakeGoogleApiClient::SERVER_ERROR);
$t8f = expectThrow(fn() => $svc8f->unpublish(eventRow($db, $ev8f)));
check('a failed unpublish surfaces the error', $t8f instanceof GoogleApiException);
$row8f = (new GoogleEventSyncRepository($db))->findByCalendarEvent($ev8f, $tenant);
check('a failed unpublish keeps the active id', ($row8f['google_event_id'] ?? '') !== '');
check('a failed unpublish records remote_outcome failed', ($row8f['remote_outcome'] ?? '') === 'failed');
check('a failed unpublish does not clear the Meet link', ($row8f['meet_url'] ?? '') !== '');

// ================================================================ 9. generation
section('9. Republish uses a new safe generation');
$c9 = new FakeGoogleApiClient();
connectUser($db, $c9, $actor, $tenant, 'organiser@example.test');
$ev9 = makeEvent($db, ['company_id' => $company, 'title' => 'Regenerate']);
$createdEvents[] = $ev9;
$svc9 = makeService($db, $c9, $policy);
$pub9 = $svc9->publish(eventRow($db, $ev9));
$firstId = $pub9->googleEventId;
$row9 = (new GoogleEventSyncRepository($db))->findByCalendarEvent($ev9, $tenant);
$firstRequest = $row9['meet_request_id'];
$gen1 = (int) $row9['generation'];
$svc9->unpublish(eventRow($db, $ev9));
$pub9b = $svc9->publish(eventRow($db, $ev9));
$row9b = (new GoogleEventSyncRepository($db))->findByCalendarEvent($ev9, $tenant);
check('republish uses a new generation', (int) $row9b['generation'] === $gen1 + 1, (string) $row9b['generation']);
check('republish uses a NEW Google event id', ($row9b['google_event_id'] ?? '') !== $firstId && $pub9b->googleEventId !== $firstId);
check('republish uses a NEW conference request id', ($row9b['meet_request_id'] ?? '') !== $firstRequest);
check('the new id embeds the generation', str_contains((string) $pub9b->googleEventId, 'g' . dechex($gen1 + 1)), (string) $pub9b->googleEventId);
check('republish created a second Google event (new id)', count($c9->inserted) === 2);
check('the previous id is retained for audit', ($row9b['last_google_event_id'] ?? '') === $firstId);

// ================================================================ 10. races
section('10. Race scenarios');

// 10a. Reschedule while publish is in flight: publish holds the lease, sync is refused.
$c10 = new FakeGoogleApiClient();
connectUser($db, $c10, $actor, $tenant, 'organiser@example.test');
$ev10 = makeEvent($db, ['company_id' => $company, 'title' => 'Race publish/sync']);
$createdEvents[] = $ev10;
$svc10 = makeService($db, $c10, $policy);
$syncRepo = new GoogleEventSyncRepository($db);
$conn10 = (new GoogleConnectionRepository($db))->findForUser($actor, $tenant);
$held = $syncRepo->reserve($tenant, $ev10, (int) $conn10['id'], 'primary', $actor, null);
$t10a = expectThrow(fn() => $svc10->sync(eventRow($db, $ev10)));
check('a sync during an in-flight publish is refused', $t10a instanceof GoogleNotPublishedException || $t10a instanceof GoogleOperationInProgressException, $t10a ? get_class($t10a) : 'none');
$syncRepo->releaseLease($ev10, $held, $tenant);

// 10b. Cancel while publish is in flight: cancelEvent never throws, marks pending.
$c10b = new FakeGoogleApiClient();
connectUser($db, $c10b, $actor, $tenant, 'organiser@example.test');
$ev10b = makeEvent($db, ['company_id' => $company, 'title' => 'Race publish/cancel']);
$createdEvents[] = $ev10b;
$svc10b = makeService($db, $c10b, $policy);
$heldB = $syncRepo->reserve($tenant, $ev10b, (int) $conn10['id'], 'primary', $actor, null);
$r10b = $svc10b->cancelEvent(eventRow($db, $ev10b));
check('a cancel during an in-flight publish does not throw', true);
$row10b = $syncRepo->findByCalendarEvent($ev10b, $tenant);
check('the cancel race leaves a retryable state', in_array(($row10b['sync_status'] ?? ''), ['update_pending', 'pending'], true), (string) ($row10b['sync_status'] ?? ''));
$syncRepo->releaseLease($ev10b, $heldB, $tenant);

// 10c. Unpublish while an update is pending: unpublish takes over the stale lease.
$c10c = new FakeGoogleApiClient();
connectUser($db, $c10c, $actor, $tenant, 'organiser@example.test');
$ev10c = makeEvent($db, ['company_id' => $company, 'title' => 'Race unpublish']);
$createdEvents[] = $ev10c;
$svc10c = makeService($db, $c10c, $policy);
$svc10c->publish(eventRow($db, $ev10c));
// Force an update_pending state with a stale claim.
$db->prepare('UPDATE google_event_sync SET sync_status="update_pending", publish_claim_token="stale", publish_claimed_at=UTC_TIMESTAMP() - INTERVAL 10 MINUTE WHERE calendar_event_id=?')->execute([$ev10c]);
$u10c = $svc10c->unpublish(eventRow($db, $ev10c));
$row10c = $syncRepo->findByCalendarEvent($ev10c, $tenant);
check('unpublish takes over a stale lease', ($row10c['sync_status'] ?? '') === 'unpublished', (string) ($row10c['sync_status'] ?? ''));

// 10d. Two concurrent reschedules: one holds the lease, the other is refused.
$c10d = new FakeGoogleApiClient();
connectUser($db, $c10d, $actor, $tenant, 'organiser@example.test');
$ev10d = makeEvent($db, ['company_id' => $company, 'title' => 'Race sync/sync']);
$createdEvents[] = $ev10d;
$svc10d = makeService($db, $c10d, $policy);
$svc10d->publish(eventRow($db, $ev10d));
$db->prepare('UPDATE calendar_events SET title="A", version=version+1 WHERE id=?')->execute([$ev10d]);
$heldD = $syncRepo->acquireLease($tenant, $ev10d, (int) $conn10['id'], 'primary', $actor);
check('a first reschedule acquires the lease', is_string($heldD) && $heldD !== '');
$t10d = expectThrow(fn() => $svc10d->sync(eventRow($db, $ev10d)));
check('a second concurrent reschedule is refused', $t10d instanceof GoogleOperationInProgressException, $t10d ? get_class($t10d) : 'none');
$syncRepo->releaseLease($ev10d, $heldD, $tenant);

// 10e. Cancellation after an etag conflict still cancels successfully.
$c10e = new FakeGoogleApiClient();
connectUser($db, $c10e, $actor, $tenant, 'organiser@example.test');
$ev10e = makeEvent($db, ['company_id' => $company, 'title' => 'Conflict then cancel']);
$createdEvents[] = $ev10e;
$svc10e = makeService($db, $c10e, $policy);
$svc10e->publish(eventRow($db, $ev10e));
$gid10e = $syncRepo->findByCalendarEvent($ev10e, $tenant)['google_event_id'];
$c10e->simulateExternalEdit($gid10e);
$db->prepare('UPDATE calendar_events SET title="local", version=version+1 WHERE id=?')->execute([$ev10e]);
expectThrow(fn() => $svc10e->sync(eventRow($db, $ev10e))); // -> conflict
$db->prepare('UPDATE calendar_events SET status="cancelled", version=version+1 WHERE id=?')->execute([$ev10e]);
$r10e = $svc10e->cancelEvent(eventRow($db, $ev10e));
$row10e = $syncRepo->findByCalendarEvent($ev10e, $tenant);
check('cancellation after a conflict succeeds', ($row10e['sync_status'] ?? '') === 'detached', (string) ($row10e['sync_status'] ?? ''));
check('the cancellation cleared conflict state', ($row10e['google_event_id'] ?? null) === null);

// 10f. Token expires during a delete: refresh-once then success.
$c10f = new FakeGoogleApiClient();
connectUser($db, $c10f, $actor, $tenant, 'organiser@example.test');
$ev10f = makeEvent($db, ['company_id' => $company, 'title' => 'Token expires on delete']);
$createdEvents[] = $ev10f;
$svc10f = makeService($db, $c10f, $policy);
$svc10f->publish(eventRow($db, $ev10f));
$db->prepare('UPDATE google_calendar_connections SET token_expires_at = UTC_TIMESTAMP() - INTERVAL 1 HOUR WHERE user_id=?')->execute([$actor]);
$ref10f = $c10f->refreshCalls;
$r10f = $svc10f->cancelEvent(eventRow($db, $ev10f));
$row10f = $syncRepo->findByCalendarEvent($ev10f, $tenant);
check('a delete refreshes once when the token expired', ($c10f->refreshCalls - $ref10f) === 1, (string) ($c10f->refreshCalls - $ref10f));
check('the delete succeeds after refresh', ($row10f['sync_status'] ?? '') === 'detached');

// 10g. Local update after the payload was prepared but before completion:
//      the completion version guard refuses to claim the newer version synced.
$c10g = new FakeGoogleApiClient();
connectUser($db, $c10g, $actor, $tenant, 'organiser@example.test');
$ev10g = makeEvent($db, ['company_id' => $company, 'title' => 'Stale worker']);
$createdEvents[] = $ev10g;
$svc10g = makeService($db, $c10g, $policy);
$svc10g->publish(eventRow($db, $ev10g));
// Advance the LOCAL version past what the sync will prepare (v+1), but the sync
// prepares for v+1 while we make the DB v+2 before markResult runs. We simulate by
// calling sync then re-reading: to force the guard we bump twice and sync once.
$db->prepare('UPDATE calendar_events SET title="v2", version=version+1 WHERE id=?')->execute([$ev10g]);
$prepared = eventRow($db, $ev10g);           // version = 2
$db->prepare('UPDATE calendar_events SET title="v3", version=version+1 WHERE id=?')->execute([$ev10g]); // now version = 3
// Manually reserve + markResult with the stale expected version to prove the guard.
$conn10g = (new GoogleConnectionRepository($db))->findForUser($actor, $tenant);
$leaseG = $syncRepo->acquireLease($tenant, $ev10g, (int) $conn10g['id'], 'primary', $actor);
$wrote = $syncRepo->markResult($ev10g, $leaseG, $tenant, [
    'google_event_id' => 'x', 'etag' => 'e', 'sync_status' => 'synced', 'synced_event_version' => 2,
], expectedEventVersion: 2);
check('a stale worker cannot claim a newer version synced', $wrote === false);
$row10g = $syncRepo->findByCalendarEvent($ev10g, $tenant);
check('the stale version was not recorded as synced', (int) ($row10g['synced_event_version'] ?? 0) !== 2 || ($row10g['sync_status'] ?? '') !== 'synced');

// ================================================================ 11. hook
section('11. GoogleCancelHook best-effort contract');
$c11 = new FakeGoogleApiClient();
connectUser($db, $c11, $actor, $tenant, 'organiser@example.test');
$ev11 = makeEvent($db, ['company_id' => $company, 'title' => 'Hook event']);
$createdEvents[] = $ev11;
$svc11 = makeService($db, $c11, $policy);
$svc11->publish(eventRow($db, $ev11));
$gid11 = (new GoogleEventSyncRepository($db))->findByCalendarEvent($ev11, $tenant)['google_event_id'];
$hook = new GoogleCancelHook($svc11, $db);
$hook->onEventCancelled(eventRow($db, $ev11));
check('the hook deletes the remote event', in_array($gid11, $c11->deleted, true));
check('the hook never throws on success', true);

// The hook must swallow a Google failure entirely.
$c11b = new FakeGoogleApiClient();
connectUser($db, $c11b, $actor, $tenant, 'organiser@example.test');
$ev11b = makeEvent($db, ['company_id' => $company, 'title' => 'Hook fails']);
$createdEvents[] = $ev11b;
$svc11b = makeService($db, $c11b, $policy);
$svc11b->publish(eventRow($db, $ev11b));
$c11b->failNext(FakeGoogleApiClient::SERVER_ERROR);
$hookB = new GoogleCancelHook($svc11b, $db);
$threw = false;
try { $hookB->onEventCancelled(eventRow($db, $ev11b)); } catch (Throwable) { $threw = true; }
check('the hook swallows a Google failure (never throws)', $threw === false);

// onEventChanged is intentionally a no-op (no email on every edit).
$patchedBefore11 = count($c11->patched);
$hook->onEventChanged(eventRow($db, $ev11));
check('onEventChanged sends nothing (explicit sync only)', count($c11->patched) === $patchedBefore11);

// ================================================================ 12. no secrets
section('12. No secrets or internal Session data');
$syncRow = $db->query('SELECT * FROM google_event_sync LIMIT 1')->fetch(PDO::FETCH_ASSOC);
$rowJson = json_encode($syncRow ?: []);
check('the sync row contains no plaintext token', !str_contains($rowJson, 'ya29.') && !str_contains($rowJson, '1//'));
check('the sync row contains no internal Session reason column', !array_key_exists('cancellation_reason', $syncRow ?: []));
check('the cancellation reason is not a Google field', !in_array('cancellationReason', array_keys($c1->patched[0] ?? []), true));

// ---------------------------------------------------------------- cleanup
cleanup($db, [$actor], $createdEvents, $createdSessions);

echo "\n==============================\n";
echo "  PASS: {$pass}   FAIL: {$fail}\n";
echo "==============================\n";
if ($fail > 0) {
    echo "\nFailures:\n";
    foreach ($failures as $f) { echo "  - {$f}\n"; }
    exit(1);
}
exit(0);
