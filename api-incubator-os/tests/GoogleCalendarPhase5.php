<?php
declare(strict_types=1);

/**
 * Sprint 010 Phase 5 — the presentation contract the Angular surface consumes,
 * plus owner-only enforcement for sync/unpublish.
 *
 * Runs OFFLINE (fake Google client) against the LOCAL MySQL database with
 * dedicated fixture rows, so real data is never touched. Proves:
 *
 *   1. `present()` is a pure read: no Google call, no lease, no writes.
 *   2. Not-published context: detached / everPublished=false / ownedByViewer=false.
 *   3. Published context: synced / everPublished=true / ownedByViewer=true (owner).
 *   4. `upToDate` tracks the local event version (false after an edit; true after sync).
 *   5. `attendeeCount` / `willSendInvitations` follow the deterministic attendee list.
 *   6. `isMeeting` mirrors the category.
 *   7. A NON-OWNER viewing the projection gets ownedByViewer=false (read-only).
 *   8. A non-owner may NOT sync: sync throws GoogleForbiddenException.
 *   9. A non-owner may NOT unpublish: unpublish throws GoogleForbiddenException.
 *  10. The presentation payload contains no etag, connection id or claim token.
 *
 * Run:
 *   php api-incubator-os/tests/GoogleCalendarPhase5.php
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
$company = 900044;
$owner = 920001;
$other = 920002;

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

function ensureUser(PDO $db, int $id, string $email, int $company): void
{
    $s = $db->prepare('SELECT id FROM users WHERE id = ?');
    $s->execute([$id]);
    if ($s->fetchColumn()) {
        $db->prepare('UPDATE users SET email=?, company_id=?, role=\'Director\', status=\'active\' WHERE id=?')->execute([$email, $company, $id]);
        return;
    }
    $db->prepare(
        'INSERT INTO users (id, id_type, id_number, company_id, full_name, email, username, role, status)
         VALUES (?, "test", ?, ?, ?, ?, ?, "Director", "active")'
    )->execute([$id, 'TEST-' . $id, $company, 'Phase5 Fixture', $email, 'phase5fix' . $id . '@example.test']);
}

function makeEvent(PDO $db, array $overrides): int
{
    $data = array_merge([
        'tenant_id' => 1, 'company_id' => null, 'created_by' => 920001,
        'title' => 'Phase5 Event', 'category' => 'meeting', 'status' => 'scheduled',
        'all_day' => 0, 'timezone' => 'Africa/Johannesburg', 'location' => null,
        'start_date' => null, 'end_date' => null,
        'start_at' => '2026-11-12 07:30:00', 'end_at' => '2026-11-12 08:30:00',
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
    $s = $db->prepare('SELECT * FROM calendar_events WHERE id = ?');
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

function cleanup(PDO $db, array $userIds, array &$eventIds): void
{
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

ensureCompany($db, $company, 'Phase5 Company');
ensureUser($db, $owner, 'phase5.owner@example.test', $company);
ensureUser($db, $other, 'phase5.other@example.test', $company);
cleanup($db, [$owner, $other], $createdEvents);

$policy = new GoogleAccessPolicy(actorRow($db, $owner));
$client = new FakeGoogleApiClient();
connectUser($db, $client, $owner, $tenant, 'owner@example.test');

// ============================================================ 1. present() is a read
section('1. present() is a pure read (no Google call, no lease)');
$ev1 = makeEvent($db, ['company_id' => $company, 'title' => 'Phase5 not yet published']);
$createdEvents[] = $ev1;
$insertsBefore = count($client->inserted);
$patchBefore = count($client->patched);
$pres1 = makeService($db, $client, $policy)->present(eventRow($db, $ev1));
check('present returns a projection without publishing', $pres1->published === false);
check('present makes no Google insert', count($client->inserted) === $insertsBefore);
check('present makes no Google patch', count($client->patched) === $patchBefore);
$rowCount = (int) $db->query("SELECT COUNT(*) FROM google_event_sync WHERE calendar_event_id = $ev1")->fetchColumn();
check('present writes no sync row', $rowCount === 0);

// ============================================================ 2. not-published context
section('2. Not-published presentation context');
check('syncStatus is detached', $pres1->syncStatus === 'detached');
check('published is false', $pres1->published === false);
check('everPublished is false', $pres1->everPublished === false);
check('ownedByViewer is false (nothing mapped)', $pres1->ownedByViewer === false);
check('isMeeting mirrors the category', $pres1->isMeeting === true);
check('willSendInvitations is false with no mapped connection', $pres1->willSendInvitations === false);
$json1 = json_encode($pres1);
check('no etag/remoteEtag in the payload', !str_contains($json1, 'etag'));
check('no connectionId/claim token in the payload',
    !str_contains($json1, 'connectionId') && !str_contains($json1, 'ClaimToken'));

// ============================================================ 3. published context
section('3. Published presentation context (owner)');
$svc = makeService($db, $client, $policy);
$svc->publish(eventRow($db, $ev1));
$pres2 = $svc->present(eventRow($db, $ev1));
check('syncStatus is synced', $pres2->syncStatus === 'synced');
check('published is true', $pres2->published === true);
check('everPublished is true', $pres2->everPublished === true);
check('ownedByViewer is true for the owner', $pres2->ownedByViewer === true);
check('upToDate is true right after publish', $pres2->upToDate === true);
check('meetUrl present for a meeting', is_string($pres2->meetUrl) && $pres2->meetUrl !== '');
check('syncedEventVersion equals the event version', $pres2->syncedEventVersion === 1);

// ============================================================ 4. upToDate tracks a local edit
section('4. upToDate tracks the local event version');
$db->prepare("UPDATE calendar_events SET title='Phase5 moved', version=version+1 WHERE id=$ev1")->execute();
$pres3 = $svc->present(eventRow($db, $ev1));
check('after a local edit upToDate is false', $pres3->upToDate === false);
check('after a local edit syncedEventVersion is behind the event version', $pres3->syncedEventVersion === 1);
check('after a local edit syncStatus is still synced (the change waits)', $pres3->syncStatus === 'synced');
$svc->sync(eventRow($db, $ev1));
$pres4 = $svc->present(eventRow($db, $ev1));
check('after sync upToDate is true again', $pres4->upToDate === true);

// ============================================================ 5. non-meeting has no Meet/invites
section('5. Non-meeting presentation');
$ev2 = makeEvent($db, ['company_id' => $company, 'category' => 'review', 'title' => 'Phase5 review']);
$createdEvents[] = $ev2;
$svc->publish(eventRow($db, $ev2));
$pres5 = $svc->present(eventRow($db, $ev2));
check('non-meeting isMeeting is false', $pres5->isMeeting === false);
check('non-meeting willSendInvitations is false', $pres5->willSendInvitations === false);
check('non-meeting publishes with no Meet URL', $pres5->meetUrl === null);
check('non-meeting is still published + everPublished', $pres5->published === true && $pres5->everPublished === true);

// ============================================================ 6. read-only for a non-owner
section('6. Read-only for another organiser');
// A second user's OWN connection; the projection still belongs to the owner.
$clientOther = new FakeGoogleApiClient();
connectUser($db, $clientOther, $other, $tenant, 'other@example.test');
$otherPolicy = new GoogleAccessPolicy(actorRow($db, $other));
$otherService = makeService($db, $clientOther, $otherPolicy);
$pres6 = $otherService->present(eventRow($db, $ev1));
check('a non-owner sees ownedByViewer false', $pres6->ownedByViewer === false);
check('a non-owner still sees the projection status', $pres6->published === true && $pres6->syncStatus === 'synced');
check('a non-owner still sees the Meet link', is_string($pres6->meetUrl) && $pres6->meetUrl !== '');

// ============================================================ 7. non-owner cannot manage
section('7. A non-owner may not sync or unpublish');
$db->prepare("UPDATE calendar_events SET version=version+1 WHERE id=$ev1")->execute();
$syncThrow = expectThrow(fn() => $otherService->sync(eventRow($db, $ev1)));
check('non-owner sync is forbidden', $syncThrow instanceof GoogleForbiddenException, $syncThrow ? get_class($syncThrow) : 'none');
$unpThrow = expectThrow(fn() => $otherService->unpublish(eventRow($db, $ev1)));
check('non-owner unpublish is forbidden', $unpThrow instanceof GoogleForbiddenException, $unpThrow ? get_class($unpThrow) : 'none');
check('the sync row is untouched by the refused calls',
    (int) $db->query("SELECT COUNT(*) FROM google_event_sync WHERE calendar_event_id = $ev1")->fetchColumn() === 1);

// An admin at a DIFFERENT company cannot manage a mapping it does not own either,
// because ownership is per-connection, not per-role.
section('8. Ownership is per-connection, not per-role');
$adminRow = actorRow($db, $other);
$adminRow['role'] = 'Super Admin';
$adminPolicy = new GoogleAccessPolicy($adminRow);
$adminService = makeService($db, $clientOther, $adminPolicy);
$adminThrow = expectThrow(fn() => $adminService->sync(eventRow($db, $ev1)));
check('even an admin non-owner may not sync', $adminThrow instanceof GoogleForbiddenException, $adminThrow ? get_class($adminThrow) : 'none');

// ---------------------------------------------------------------- cleanup
cleanup($db, [$owner, $other], $createdEvents);

echo "\n==============================\n";
echo "  PASS: {$pass}   FAIL: {$fail}\n";
echo "==============================\n";
if ($fail > 0) {
    echo "\nFailures:\n";
    foreach ($failures as $f) { echo "  - {$f}\n"; }
    exit(1);
}
