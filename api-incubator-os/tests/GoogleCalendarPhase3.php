<?php
declare(strict_types=1);

/**
 * Sprint 010 Phase 3 — publish + automatic Meet link service suite.
 *
 * Runs OFFLINE (fake Google client) against the LOCAL MySQL database with
 * dedicated fixture rows, so real data is never touched. Proves:
 *
 *   1. Successful fake publish (meeting) — event URL, Meet URL, stored requestId.
 *   2. Deterministic idempotent retry — publish twice yields ONE Google event.
 *   3. Google-success/local-failure recovery (response lost) — no duplicate.
 *   4. Google fails before creation — mapping remains retryable.
 *   5. Concurrent publish — the lease admits one publisher; Google called once.
 *   6. Conference stays pending; promoted to synced on a later read.
 *   7. Conference fails while the Calendar event exists.
 *   8. Attendee filtering: normalise, case-insensitive dedupe, exclude organiser,
 *      invalid and inactive, deterministic order.
 *   9. No-Session event publishes with NO attendees and sendUpdates=none.
 *  10. Non-meeting event has no conference and no Meet URL.
 *  11. Timed date translation preserves the instant + IANA zone (incl. DST).
 *  12. All-day translation: Google end is exclusive (month-end and year-end too).
 *  13. Cross-company and system-wide authorization rejection.
 *  14. Disconnected / needs_reconnect rejection (no Google call).
 *  15. No sensitive local content in the Google payload.
 *  16. Secret redaction regression.
 *
 * Run:
 *   php api-incubator-os/tests/GoogleCalendarPhase3.php
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
$companyA = 900011;
$companyB = 900022;
$actorA = 910001;        // Director in company A
$actorOther = 910002;    // Director in company B
$actorAdmin = 910003;    // System Administrator (tenant-wide)
$participant = 910004;   // active internal participant with an email
$inactive = 910005;      // inactive internal participant

/** @var int[] */
$createdEvents = [];
/** @var int[] */
$createdSessions = [];

function ensureCompany(PDO $db, int $id, string $name): void
{
    $s = $db->prepare('SELECT id FROM companies WHERE id = ?');
    $s->execute([$id]);
    if ($s->fetchColumn()) { return; }
    $db->prepare('INSERT INTO companies (id, name) VALUES (?, ?)')->execute([$id, $name]);
}

function ensureUser(PDO $db, int $id, string $email, int $company, string $role, string $status = 'active'): void
{
    $s = $db->prepare('SELECT id FROM users WHERE id = ?');
    $s->execute([$id]);
    if ($s->fetchColumn()) {
        $db->prepare('UPDATE users SET email=?, company_id=?, role=?, status=? WHERE id=?')
           ->execute([$email, $company, $role, $status, $id]);
        return;
    }
    $db->prepare(
        'INSERT INTO users (id, id_type, id_number, company_id, full_name, email, username, role, status)
         VALUES (?, "test", ?, ?, ?, ?, ?, ?, ?)'
    )->execute([$id, 'TEST-' . $id, $company, 'Phase3 Fixture ' . $id, $email, 'phase3fix' . $id . '@example.test', $role, $status]);
}

function makeEvent(PDO $db, array $overrides): int
{
    $data = array_merge([
        'tenant_id' => 1, 'company_id' => null, 'created_by' => 910001,
        'title' => 'Phase3 Event', 'category' => 'meeting', 'status' => 'scheduled',
        'all_day' => 0, 'timezone' => 'Africa/Johannesburg', 'location' => null,
        'start_date' => null, 'end_date' => null,
        'start_at' => '2026-09-15 07:30:00', 'end_at' => '2026-09-15 08:30:00',
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

// ---------------------------------------------------------------- fixtures
try {
    ensureCompany($db, $companyA, 'Phase3 Company A');
    ensureCompany($db, $companyB, 'Phase3 Company B');
    ensureUser($db, $actorA, 'phase3.actor.a@example.test', $companyA, 'Director');
    ensureUser($db, $actorOther, 'phase3.actor.b@example.test', $companyB, 'Director');
    ensureUser($db, $actorAdmin, 'phase3.admin@example.test', $companyA, 'System Administrator');
    ensureUser($db, $participant, 'phase3.participant@example.test', $companyA, 'Coordinator');
    ensureUser($db, $inactive, 'phase3.inactive@example.test', $companyA, 'Director', 'inactive');
} catch (Throwable $e) {
    fwrite(STDERR, "Fixture setup failed: {$e->getMessage()}\n");
    exit(2);
}

function cleanup(PDO $db, array $userIds, array $companyIds, array &$eventIds, array &$sessionIds): void
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

$fixtureUsers = [$actorA, $actorOther, $actorAdmin, $participant, $inactive];
cleanup($db, $fixtureUsers, [$companyA, $companyB], $createdEvents, $createdSessions);

// ---------------------------------------------------------------- 1. successful publish
section('1. Successful fake publish (meeting + Meet link)');
$client1 = new FakeGoogleApiClient();
connectUser($db, $client1, $actorA, $tenant, 'organiser.a@example.test');

$eventA = makeEvent($db, ['company_id' => $companyA, 'title' => 'Kickoff meeting']);
$createdEvents[] = $eventA;
$policyA = new GoogleAccessPolicy(actorRow($db, $actorA));
$svc = makeService($db, $client1, $policyA);

$res = $svc->publish((new CalendarEventRepositoryStub($db))->find($eventA));
check('publish reports the event as published', $res->published === true);
check('sync status is synced on synchronous Meet success', $res->syncStatus === 'synced', $res->syncStatus);
check('conference status is success', $res->conferenceStatus === 'success', $res->conferenceStatus);
check('a Meet URL is returned', is_string($res->meetUrl) && $res->meetUrl !== '', (string) $res->meetUrl);
check('a Google event URL is returned', is_string($res->googleEventUrl) && str_contains((string) $res->googleEventUrl, 'calendar.google.com'));
check('fullySynced is true', $res->fullySynced() === true);
check('exactly one Google insert occurred', count($client1->inserted) === 1, (string) count($client1->inserted));

$rowA = (new GoogleEventSyncRepository($db))->findByCalendarEvent($eventA, $tenant);
check('a sync row was persisted', $rowA !== null);
check('google_event_id stored', ($rowA['google_event_id'] ?? '') !== '');
check('meet_request_id stored (stable key)', ($rowA['meet_request_id'] ?? '') !== '');
check('conference_status stored as success', ($rowA['conference_status'] ?? '') === 'success');
$reqId = (string) $rowA['meet_request_id'];
check('stored requestId is a UUID v4', preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/', $reqId) === 1, $reqId);
check('the insert used the stored requestId', ($client1->inserted[0]['conferenceData']['createRequest']['requestId'] ?? '') === $reqId);
check('the conference solution is hangoutsMeet', ($client1->inserted[0]['conferenceData']['createRequest']['conferenceSolutionKey']['type'] ?? '') === 'hangoutsMeet');
check('the insert sent a deterministic id', ($client1->inserted[0]['id'] ?? '') === GoogleEventMapper::idFor($tenant, $eventA));
check('conferenceDataVersion forwarded', ($client1->insertOptions[0]['conferenceDataVersion'] ?? 0) === 1);
check('no attendees -> sendUpdates=none', ($client1->insertOptions[0]['sendUpdates'] ?? '') === 'none', (string) ($client1->insertOptions[0]['sendUpdates'] ?? ''));

// ---------------------------------------------------------------- 2. idempotent retry
section('2. Deterministic idempotent retry');
$res2 = $svc->publish((new CalendarEventRepositoryStub($db))->find($eventA));
check('second publish still reports published', $res2->published === true);
check('second publish did NOT call Google again', count($client1->inserted) === 1, (string) count($client1->inserted));
check('the same google_event_id is returned', $res2->googleEventId === $res->googleEventId);
$countRows = (int) $db->query('SELECT COUNT(*) FROM google_event_sync WHERE calendar_event_id = ' . $eventA)->fetchColumn();
check('exactly one sync row exists', $countRows === 1);

// ---------------------------------------------------------------- 3. success + lost response
section('3. Google succeeds but the response is lost, then recovery');
$client3 = new FakeGoogleApiClient();
connectUser($db, $client3, $actorA, $tenant, 'organiser.a@example.test');
$eventLoss = makeEvent($db, ['company_id' => $companyA, 'title' => 'Lost response event']);
$createdEvents[] = $eventLoss;
$client3->failNext(FakeGoogleApiClient::CREATE_THEN_TIMEOUT);
$svc3 = makeService($db, $client3, $policyA);

$thrown = expectThrow(fn() => $svc3->publish((new CalendarEventRepositoryStub($db))->find($eventLoss)));
check('a lost response surfaces as a timeout', $thrown instanceof GoogleApiException && $thrown->reason() === GoogleApiException::REASON_TIMEOUT);
$rowLoss = (new GoogleEventSyncRepository($db))->findByCalendarEvent($eventLoss, $tenant);
check('mapping remains retryable (no google_event_id yet)', ($rowLoss['google_event_id'] ?? null) === null);
check('failure is recorded on the sync row', ($rowLoss['sync_status'] ?? '') === 'failed', (string) ($rowLoss['sync_status'] ?? ''));
check('the failed row records a secret-free error', ($rowLoss['last_error'] ?? '') !== '' && !str_contains((string) $rowLoss['last_error'], 'ya29'));

// retry: Google already has the deterministic id -> recover, do not duplicate
$recovered = $svc3->publish((new CalendarEventRepositoryStub($db))->find($eventLoss));
check('retry recovers the existing Google event', $recovered->published === true && $recovered->googleEventId === GoogleEventMapper::idFor($tenant, $eventLoss));
check('retry issued no SECOND successful insert', count($client3->inserted) === 0 && $client3->insertCalls === 2, 'inserts=' . count($client3->inserted) . ' calls=' . $client3->insertCalls);
$rowLoss2 = (new GoogleEventSyncRepository($db))->findByCalendarEvent($eventLoss, $tenant);
check('recovered row is now synced', ($rowLoss2['sync_status'] ?? '') === 'synced');

// ---------------------------------------------------------------- 4. fails before creation
section('4. Google fails before creation -> retryable');
$client4 = new FakeGoogleApiClient();
connectUser($db, $client4, $actorA, $tenant, 'organiser.a@example.test');
$eventFail = makeEvent($db, ['company_id' => $companyA, 'title' => 'Fails before create']);
$createdEvents[] = $eventFail;
$client4->failNext(FakeGoogleApiClient::SERVER_ERROR);
$svc4 = makeService($db, $client4, $policyA);
$t4 = expectThrow(fn() => $svc4->publish((new CalendarEventRepositoryStub($db))->find($eventFail)));
check('a 5xx surfaces as a server error', $t4 instanceof GoogleApiException && $t4->reason() === GoogleApiException::REASON_SERVER_ERROR);
$row4 = (new GoogleEventSyncRepository($db))->findByCalendarEvent($eventFail, $tenant);
check('no google_event_id was written', ($row4['google_event_id'] ?? null) === null);
check('the lease was released for retry', ($row4['publish_claim_token'] ?? null) === null);

$client4->failNext(FakeGoogleApiClient::SUCCESS);
$ok4 = $svc4->publish((new CalendarEventRepositoryStub($db))->find($eventFail));
check('a later retry succeeds', $ok4->published === true && $ok4->syncStatus === 'synced');

// ---------------------------------------------------------------- 5. concurrency
section('5. Concurrent publish (lease admits one publisher)');
$client5 = new FakeGoogleApiClient();
connectUser($db, $client5, $actorA, $tenant, 'organiser.a@example.test');
$eventConc = makeEvent($db, ['company_id' => $companyA, 'title' => 'Concurrent event']);
$createdEvents[] = $eventConc;
$sync5 = new GoogleEventSyncRepository($db);
$svc5 = makeService($db, $client5, $policyA);

// Simulate a first publisher holding a live lease.
$conn5 = (new GoogleConnectionRepository($db))->findForUser($actorA, $tenant);
$heldLease = $sync5->reserve($tenant, $eventConc, (int) $conn5['id'], 'primary', $actorA, null);
check('the first publisher acquires the lease', is_string($heldLease) && $heldLease !== '');

$t5 = expectThrow(fn() => $svc5->publish((new CalendarEventRepositoryStub($db))->find($eventConc)));
check('the second publisher is refused (no Google call)', $t5 instanceof GooglePublishInProgressException, get_class((object) $t5));
check('the refused publisher did not call Google', count($client5->inserted) === 0);

// Release and retry: now one publish succeeds, exactly one Google event.
$sync5->releaseLease($eventConc, $heldLease, $tenant);
$ok5 = $svc5->publish((new CalendarEventRepositoryStub($db))->find($eventConc));
check('after the lease frees, publish succeeds', $ok5->published === true);
check('exactly one Google event across the race', count($client5->inserted) === 1, (string) count($client5->inserted));

// ---------------------------------------------------------------- 6. pending conference
section('6. Conference stays pending, then promotes');
$client6 = new FakeGoogleApiClient(meetPending: true);
connectUser($db, $client6, $actorA, $tenant, 'organiser.a@example.test');
$eventPend = makeEvent($db, ['company_id' => $companyA, 'title' => 'Pending Meet']);
$createdEvents[] = $eventPend;
$svc6 = makeService($db, $client6, $policyA);
$pend = $svc6->publish((new CalendarEventRepositoryStub($db))->find($eventPend));
check('pending conference -> sync status pending', $pend->syncStatus === 'pending', $pend->syncStatus);
check('pending conference -> conference status pending', $pend->conferenceStatus === 'pending', $pend->conferenceStatus);
check('pending conference has no Meet URL yet', $pend->meetUrl === null);
check('pending publish is NOT fully synced', $pend->fullySynced() === false);
$rowPend = (new GoogleEventSyncRepository($db))->findByCalendarEvent($eventPend, $tenant);
check('google_event_id was still stored while pending', ($rowPend['google_event_id'] ?? '') !== '');

// Google finishes the conference; a later publish safely resumes and promotes.
$client6->setMeetPending(false);
$promoted = $svc6->publish((new CalendarEventRepositoryStub($db))->find($eventPend));
check('resume promotes to synced', $promoted->syncStatus === 'synced', $promoted->syncStatus);
check('resume promotes the conference to success', $promoted->conferenceStatus === 'success', $promoted->conferenceStatus);
check('resume exposes the Meet URL', is_string($promoted->meetUrl) && $promoted->meetUrl !== '');
check('resume did not create a second event', count($client6->inserted) === 1, (string) count($client6->inserted));

// ---------------------------------------------------------------- 7. conference failure
section('7. Conference fails while the Calendar event exists');
$client7 = new FakeGoogleApiClient();
$client7->setMeetFailure(true);
connectUser($db, $client7, $actorA, $tenant, 'organiser.a@example.test');
$eventCf = makeEvent($db, ['company_id' => $companyA, 'title' => 'Meet fails']);
$createdEvents[] = $eventCf;
$svc7 = makeService($db, $client7, $policyA);
$cf = $svc7->publish((new CalendarEventRepositoryStub($db))->find($eventCf));
check('event is synced even though the conference failed', $cf->syncStatus === 'synced', $cf->syncStatus);
check('conference status is failure', $cf->conferenceStatus === 'failure', $cf->conferenceStatus);
check('no Meet URL on conference failure', $cf->meetUrl === null);
check('failed conference is NOT fully synced', $cf->fullySynced() === false);
check('the Google event id is retained', ($cf->googleEventId ?? '') !== '');

// ---------------------------------------------------------------- 8. attendees
section('8. Attendee filtering and deduplication');
$client8 = new FakeGoogleApiClient();
connectUser($db, $client8, $actorA, $tenant, 'organiser.a@example.test');
$eventAtt = makeEvent($db, ['company_id' => $companyA, 'title' => 'With participants']);
$createdEvents[] = $eventAtt;
$orgEmail = 'organiser.a@example.test';
$db->prepare(
    'INSERT INTO sessions (tenant_id, company_id, calendar_event_id, session_type, subject, status, created_by)
     VALUES (1, ?, ?, "coaching", "Attendee Session", "PREPARING", ?)'
)->execute([$companyA, $eventAtt, $actorA]);
$sessionId = (int) $db->lastInsertId();
$createdSessions[] = $sessionId;

$addPart = $db->prepare(
    'INSERT INTO session_participants (session_id, participant_type, user_id, name, email, attendance, created_by)
     VALUES (?, ?, ?, ?, ?, "invited", ?)'
);
$addPart->execute([$sessionId, 'internal', $participant, 'Active User', 'participant@example.test', $actorA]);
$addPart->execute([$sessionId, 'internal', $inactive, 'Inactive User', 'inactive@example.test', $actorA]);       // excluded: inactive
$addPart->execute([$sessionId, 'external', null, 'External One', 'external1@example.test', $actorA]);
$addPart->execute([$sessionId, 'external', null, 'Dup Across Types', 'PHASE3.PARTICIPANT@Example.test', $actorA]); // dedupe vs internal (case)
$addPart->execute([$sessionId, 'external', null, 'Padded Dup', '  external1@example.test  ', $actorA]);          // dedupe after trim
$addPart->execute([$sessionId, 'external', null, 'No Email', null, $actorA]);                                    // excluded: missing
$addPart->execute([$sessionId, 'external', null, 'Bad Email', 'not-an-email', $actorA]);                         // excluded: invalid
$addPart->execute([$sessionId, 'external', null, 'The Organiser', $orgEmail, $actorA]);                          // excluded: organiser

$svc8 = makeService($db, $client8, $policyA);
$res8 = $svc8->publish((new CalendarEventRepositoryStub($db))->find($eventAtt));
$att = $client8->inserted[0]['attendees'] ?? [];
$emails = array_map(static fn ($a) => $a['email'], $att);
check('attendees are sent when a Session has them', count($att) === 2, 'count=' . count($att));
check('the internal participant resolves to the live user email', in_array('phase3.participant@example.test', $emails, true));
check('the external participant is included', in_array('external1@example.test', $emails, true));
check('the organiser is excluded', !in_array($orgEmail, $emails, true));
check('the inactive user is excluded', !in_array('inactive@example.test', $emails, true));
check('the invalid email is excluded', !in_array('not-an-email', $emails, true));
check('the case-duplicate is deduped', count($emails) === count(array_unique($emails)));
check('ordering is deterministic (sorted)', $emails === array_values($emails) && (function () use ($emails) {
    $sorted = $emails; sort($sorted, SORT_STRING); return $sorted === $emails;
})());
check('attendees -> sendUpdates=all', ($client8->insertOptions[0]['sendUpdates'] ?? '') === 'all');
check('the Session subject is in the description', str_contains((string) ($client8->inserted[0]['description'] ?? ''), 'Attendee Session'));

// ---------------------------------------------------------------- 9. no session
section('9. No-Session event behaviour');
$client9 = new FakeGoogleApiClient();
connectUser($db, $client9, $actorA, $tenant, 'organiser.a@example.test');
$eventNoSess = makeEvent($db, ['company_id' => $companyA, 'title' => 'No session']);
$createdEvents[] = $eventNoSess;
$svc9 = makeService($db, $client9, $policyA);
$svc9->publish((new CalendarEventRepositoryStub($db))->find($eventNoSess));
check('generic event publishes with no attendees', !isset($client9->inserted[0]['attendees']) || $client9->inserted[0]['attendees'] === []);
check('generic event uses sendUpdates=none', ($client9->insertOptions[0]['sendUpdates'] ?? '') === 'none');

// ---------------------------------------------------------------- 10. non-meeting
section('10. Non-meeting event has no conference');
$client10 = new FakeGoogleApiClient();
connectUser($db, $client10, $actorA, $tenant, 'organiser.a@example.test');
$eventDeadline = makeEvent($db, ['company_id' => $companyA, 'title' => 'Deadline', 'category' => 'deadline']);
$createdEvents[] = $eventDeadline;
$svc10 = makeService($db, $client10, $policyA);
$d10 = $svc10->publish((new CalendarEventRepositoryStub($db))->find($eventDeadline));
check('non-meeting publish has no conferenceData', !isset($client10->inserted[0]['conferenceData']));
check('non-meeting publish has no Meet URL', $d10->meetUrl === null);
check('non-meeting conference status is none', $d10->conferenceStatus === 'none', $d10->conferenceStatus);
check('non-meeting publish is fully synced', $d10->fullySynced() === true);
$row10 = (new GoogleEventSyncRepository($db))->findByCalendarEvent($eventDeadline, $tenant);
check('no meet_request_id stored for a non-meeting event', ($row10['meet_request_id'] ?? null) === null);

// ---------------------------------------------------------------- 11. timed dates
section('11. Timed date translation (instant + IANA zone)');
$mapper = new GoogleEventMapper();
$jhb = $mapper->buildEvent([
    'id' => 1, 'title' => 'JHB', 'all_day' => false, 'timezone' => 'Africa/Johannesburg',
    'start_at' => '2026-09-15 07:30:00', 'end_at' => '2026-09-15 08:30:00', 'company_id' => null,
], 'inc00000001', null, [], null);
check('JHB start preserves the instant as 09:30+02:00', ($jhb['start']['dateTime'] ?? '') === '2026-09-15T09:30:00+02:00', (string) ($jhb['start']['dateTime'] ?? ''));
check('JHB carries the IANA timeZone', ($jhb['start']['timeZone'] ?? '') === 'Africa/Johannesburg');
check('JHB all-day fields absent', !isset($jhb['start']['date']));

$nyWinter = $mapper->buildEvent([
    'id' => 2, 'title' => 'NY Winter', 'all_day' => false, 'timezone' => 'America/New_York',
    'start_at' => '2026-01-15 14:00:00', 'end_at' => '2026-01-15 15:00:00', 'company_id' => null,
], 'inc00000002', null, [], null);
check('NY winter offset is -05:00 (EST)', ($nyWinter['start']['dateTime'] ?? '') === '2026-01-15T09:00:00-05:00', (string) ($nyWinter['start']['dateTime'] ?? ''));

$nySummer = $mapper->buildEvent([
    'id' => 3, 'title' => 'NY Summer', 'all_day' => false, 'timezone' => 'America/New_York',
    'start_at' => '2026-07-15 13:00:00', 'end_at' => '2026-07-15 14:00:00', 'company_id' => null,
], 'inc00000003', null, [], null);
check('NY summer offset is -04:00 (EDT)', ($nySummer['start']['dateTime'] ?? '') === '2026-07-15T09:00:00-04:00', (string) ($nySummer['start']['dateTime'] ?? ''));

// ---------------------------------------------------------------- 12. all-day dates
section('12. All-day translation (Google end exclusive)');
$oneDay = $mapper->buildEvent([
    'id' => 4, 'title' => 'One day', 'all_day' => true, 'timezone' => null,
    'start_date' => '2026-09-15', 'end_date' => '2026-09-15', 'company_id' => null,
], 'inc00000004', null, [], null);
check('one-day start is the 15th', ($oneDay['start']['date'] ?? '') === '2026-09-15');
check('one-day Google end is the 16th (exclusive)', ($oneDay['end']['date'] ?? '') === '2026-09-16', (string) ($oneDay['end']['date'] ?? ''));
check('all-day has no timeZone', !isset($oneDay['start']['timeZone']));

$monthEnd = $mapper->buildEvent([
    'id' => 5, 'title' => 'Month end', 'all_day' => true, 'timezone' => null,
    'start_date' => '2026-01-31', 'end_date' => '2026-01-31', 'company_id' => null,
], 'inc00000005', null, [], null);
check('month-end rolls into February', ($monthEnd['end']['date'] ?? '') === '2026-02-01', (string) ($monthEnd['end']['date'] ?? ''));

$yearEnd = $mapper->buildEvent([
    'id' => 6, 'title' => 'Year end', 'all_day' => true, 'timezone' => null,
    'start_date' => '2026-12-31', 'end_date' => '2027-01-02', 'company_id' => null,
], 'inc00000006', null, [], null);
check('year-end multi-day rolls into the next year', ($yearEnd['end']['date'] ?? '') === '2027-01-03', (string) ($yearEnd['end']['date'] ?? ''));

// ---------------------------------------------------------------- 13. authorization
section('13. Cross-company and system-wide authorization');
$eventB = makeEvent($db, ['company_id' => $companyB, 'title' => 'Other company']);
$createdEvents[] = $eventB;
$client13 = new FakeGoogleApiClient();
connectUser($db, $client13, $actorA, $tenant, 'organiser.a@example.test');
$svc13 = makeService($db, $client13, $policyA);
$t13 = expectThrow(fn() => $svc13->publish((new CalendarEventRepositoryStub($db))->find($eventB)));
check('a director cannot publish another company event', $t13 instanceof GoogleForbiddenException);
check('no Google call for a forbidden event', count($client13->inserted) === 0);

$eventSystem = makeEvent($db, ['company_id' => null, 'title' => 'System-wide']);
$createdEvents[] = $eventSystem;
$t13b = expectThrow(fn() => $svc13->publish((new CalendarEventRepositoryStub($db))->find($eventSystem)));
check('a director cannot publish a system-wide event', $t13b instanceof GoogleForbiddenException);

// admin may publish system-wide
$client13c = new FakeGoogleApiClient();
connectUser($db, $client13c, $actorAdmin, $tenant, 'admin@example.test');
$policyAdmin = new GoogleAccessPolicy(actorRow($db, $actorAdmin));
$svc13c = makeService($db, $client13c, $policyAdmin);
$ok13 = $svc13c->publish((new CalendarEventRepositoryStub($db))->find($eventSystem));
check('an administrator may publish a system-wide event', $ok13->published === true);

// ---------------------------------------------------------------- 14. connection state
section('14. Disconnected and needs_reconnect rejection');
$eventNoConn = makeEvent($db, ['company_id' => $companyA, 'title' => 'No connection']);
$createdEvents[] = $eventNoConn;
$client14 = new FakeGoogleApiClient();
$policyNoConn = new GoogleAccessPolicy(actorRow($db, $actorA));
cleanup($db, [$actorA], [], $createdEvents, $createdSessions); // ensure no connection for actorA
// cleanup removed our events; re-create the ones we still need below.
$eventNoConn = makeEvent($db, ['company_id' => $companyA, 'title' => 'No connection']);
$createdEvents[] = $eventNoConn;
$svc14 = makeService($db, $client14, $policyNoConn);
$t14 = expectThrow(fn() => $svc14->publish((new CalendarEventRepositoryStub($db))->find($eventNoConn)));
check('publishing with no connection is refused', $t14 instanceof GoogleNotConnectedException);
check('no Google call without a connection', count($client14->inserted) === 0);

// needs_reconnect
connectUser($db, $client14, $actorA, $tenant, 'organiser.a@example.test');
$db->prepare('UPDATE google_calendar_connections SET status = "needs_reconnect" WHERE user_id = ?')->execute([$actorA]);
$eventNr = makeEvent($db, ['company_id' => $companyA, 'title' => 'Needs reconnect']);
$createdEvents[] = $eventNr;
$t14b = expectThrow(fn() => $svc14->publish((new CalendarEventRepositoryStub($db))->find($eventNr)));
check('needs_reconnect is refused', $t14b instanceof GoogleNotConnectedException);
check('the refusal reports the connection status', $t14b instanceof GoogleNotConnectedException && $t14b->connectionStatus() === 'needs_reconnect');

// ---------------------------------------------------------------- 15. no sensitive content
section('15. No sensitive local content in the Google payload');
$client15 = new FakeGoogleApiClient();
connectUser($db, $client15, $actorA, $tenant, 'organiser.a@example.test');
$secretNotes = 'CONFIDENTIAL: cash flow is negative; SWOT weakness: leadership gap';
$eventSens = makeEvent($db, [
    'company_id' => $companyA,
    'title' => 'Sensitive',
    'description' => $secretNotes,
]);
$createdEvents[] = $eventSens;
$svc15 = makeService($db, $client15, $policyA);
$svc15->publish((new CalendarEventRepositoryStub($db))->find($eventSens));
$payloadJson = json_encode($client15->inserted[0]);
check('the local description is NOT in the Google payload', !str_contains((string) $payloadJson, 'CONFIDENTIAL'));
check('SWOT content is NOT in the Google payload', !str_contains((string) $payloadJson, 'SWOT'));
check('financial content is NOT in the Google payload', !str_contains((string) $payloadJson, 'cash flow'));
check('the payload carries an Incubator OS link', str_contains((string) ($client15->inserted[0]['description'] ?? ''), 'Open in Incubator OS'));

// ---------------------------------------------------------------- 16. redaction
section('16. Secret redaction regression');
$red = SecretRedactor::redact('token ya29.abcdef123456 and refresh 1//xyz789 and secret GOCSPX-abc');
check('access token redacted', !str_contains($red, 'ya29.abcdef123456'));
check('refresh token redacted', !str_contains($red, '1//xyz789'));
check('client secret redacted', !str_contains($red, 'GOCSPX-abc'));
check('placeholder present', str_contains($red, '[redacted]'));
$syncJson = json_encode((new GoogleEventSyncRepository($db))->findByCalendarEvent($eventSens, $tenant));
check('the sync row never contains a plaintext token', !str_contains((string) $syncJson, 'ya29.') && !str_contains((string) $syncJson, '1//'));

// ---------------------------------------------------------------- 17. sync response shape
section('17. Sync response exposes no secrets');
$resp = new GoogleEventSyncResponse(calendarEventId: 1, syncStatus: 'synced', conferenceStatus: 'success', published: true);
$rj = strtolower((string) json_encode($resp));
foreach (['cipher', 'nonce', 'tag', 'secret', 'access_token', 'refresh_token', 'key_version'] as $needle) {
    check("sync response JSON omits '{$needle}'", !str_contains($rj, $needle));
}

// ---------------------------------------------------------------- 18. refresh once
section('18. Access token refreshed once before publish');
$client18 = new FakeGoogleApiClient();
connectUser($db, $client18, $actorA, $tenant, 'organiser.a@example.test');
$eventRefresh = makeEvent($db, ['company_id' => $companyA, 'title' => 'Refresh once']);
$createdEvents[] = $eventRefresh;
// Expire the stored access token so a refresh is required.
$db->prepare('UPDATE google_calendar_connections SET token_expires_at = UTC_TIMESTAMP() - INTERVAL 1 HOUR WHERE user_id = ?')->execute([$actorA]);
$before = $client18->refreshCalls;
$svc18 = makeService($db, $client18, $policyA);
$r18 = $svc18->publish((new CalendarEventRepositoryStub($db))->find($eventRefresh));
$after = $client18->refreshCalls;
check('publish succeeds after a transparent refresh', $r18->published === true);
check('exactly one refresh occurred', ($after - $before) === 1, 'refreshes=' . ($after - $before));

// A 401 on the insert after the refresh must stop (no refresh loop).
$client19 = new FakeGoogleApiClient();
connectUser($db, $client19, $actorA, $tenant, 'organiser.a@example.test');
$event401 = makeEvent($db, ['company_id' => $companyA, 'title' => '401 event']);
$createdEvents[] = $event401;
$db->prepare('UPDATE google_calendar_connections SET token_expires_at = UTC_TIMESTAMP() - INTERVAL 1 HOUR WHERE user_id = ?')->execute([$actorA]);
$refreshesBefore = $client19->refreshCalls;
// failNext applies to the NEXT call in order: refresh first, then the insert.
$client19->failNext(FakeGoogleApiClient::SUCCESS, FakeGoogleApiClient::UNAUTHORIZED);
$svc19 = makeService($db, $client19, $policyA);
$t19 = expectThrow(fn() => $svc19->publish((new CalendarEventRepositoryStub($db))->find($event401)));
check('a 401 after refresh surfaces as unauthorised', $t19 instanceof GoogleApiException && $t19->reason() === GoogleApiException::REASON_UNAUTHORIZED, $t19 instanceof GoogleApiException ? $t19->reason() : 'n/a');
check('the refresh loop was NOT retried', ($client19->refreshCalls - $refreshesBefore) === 1, 'refreshes=' . ($client19->refreshCalls - $refreshesBefore));

// invalid_grant during refresh -> needs_reconnect, and the publish is refused.
$client20 = new FakeGoogleApiClient();
connectUser($db, $client20, $actorA, $tenant, 'organiser.a@example.test');
$eventIg = makeEvent($db, ['company_id' => $companyA, 'title' => 'invalid_grant event']);
$createdEvents[] = $eventIg;
$db->prepare('UPDATE google_calendar_connections SET token_expires_at = UTC_TIMESTAMP() - INTERVAL 1 HOUR WHERE user_id = ?')->execute([$actorA]);
$client20->failNext(FakeGoogleApiClient::INVALID_GRANT);
$svc20 = makeService($db, $client20, $policyA);
$t20 = expectThrow(fn() => $svc20->publish((new CalendarEventRepositoryStub($db))->find($eventIg)));
check('invalid_grant surfaces as a Google API error', $t20 instanceof GoogleApiException);
$conn20 = (new GoogleConnectionRepository($db))->findForUser($actorA, $tenant);
check('invalid_grant flips the connection to needs_reconnect', ($conn20['status'] ?? '') === 'needs_reconnect', (string) ($conn20['status'] ?? ''));

// ---------------------------------------------------------------- cleanup
cleanup($db, $fixtureUsers, [$companyA, $companyB], $createdEvents, $createdSessions);
echo "\n==============================\n";
echo "  PASS: {$pass}   FAIL: {$fail}\n";
echo "==============================\n";
if ($fail > 0) {
    echo "\nFailures:\n";
    foreach ($failures as $f) { echo "  - {$f}\n"; }
    exit(1);
}
exit(0);

/**
 * Test-only helper: fetch a calendar event row the way the repository does, so
 * the service receives a realistic shape.
 */
final class CalendarEventRepositoryStub
{
    public function __construct(private PDO $db) {}

    /** @return array<string,mixed>|null */
    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT e.*, c.name AS company_name FROM calendar_events e
              LEFT JOIN companies c ON c.id = e.company_id
              WHERE e.id = :id AND e.deleted_at IS NULL'
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }
}
